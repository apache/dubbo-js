/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import debug from 'debug';
import compose from 'koa-compose';
import {isFunction, isString} from 'util';
import config from '../common/config';
import RequestContext from './request-context';
import {go} from '../common/go';
import Queue from './queue';
import {fromRegistry} from '../registry';
import Scheduler from './scheduler';
import {
  IDubboProps,
  IDubboProvider,
  IDubboSubscriber,
  IObservable,
  ITrace,
  Middleware,
  TDubboService,
} from '../types';
import {msg, noop, traceInfo} from '../common/util';

const log = debug('dubbo:bootstrap');
const packageVersion = require('../../package.json').version;
log('dubbo-js version :=> %s', packageVersion);

/**
 * Dubbo
 *
 * 1. 连接注册中心zookeeper
 * 2. 发起远程dubbo service的方法调用
 * 3. 序列化/反序列化dubbo协议
 * 4. 管理tcp连接以及心跳
 * 5. 通过代理机制自动代理interface对应的方法
 * 6. 提供直连的方式快速测试接口
 * 7. Middleware
 * 8. 通过zone-context可以实现dubbo调用的全链路跟踪
 * 9. 集中消息管理
 */
export default class Dubbo<TService = Object>
  implements IObservable<IDubboSubscriber> {
  constructor(props: IDubboProps) {
    this._props = props;

    // check dubbo setting
    if (!props.dubboSetting) {
      throw new Error('Please specify dubboSetting');
    }

    // check dubbo register
    if (!isString(props.registry) && !isFunction(props.registry)) {
      throw new Error('Dubbo register must be string of function ');
    }

    this._interfaces = [];
    this._middleware = [];
    this._service = <TDubboService<TService>>{};

    //初始化队列
    this._queue = Queue.create();

    //初始化config
    //全局超时时间(最大熔断时间)类似<dubbo:consumer timeout="sometime"/>
    //对应consumer客户端来说，用户设置了接口级别的超时时间，就使用接口级别的
    //如果用户没有设置用户级别，默认就是最大超时时间
    const {dubboInvokeTimeout, dubboSocketPool} = props;
    config.dubboInvokeTimeout = dubboInvokeTimeout || config.dubboInvokeTimeout;
    config.dubboSocketPool = dubboSocketPool || config.dubboSocketPool;

    log(`initial:|> %O`, props);
    log('config:|> %O', config);

    //注册dubbo需要处理接口服务
    this._registryService(props.service);
    log('interfaces:|>', this._interfaces);

    this._readyPromise = new Promise(resolve => {
      this._readyResolve = resolve;
    });
    this._subscriber = {onTrace: noop};
    //初始化消息监听
    this._initMsgListener();

    // get registry center
    let register = fromRegistry(this._props.registry);

    //create scheduler
    Scheduler.from(
      register({
        type: 'consumer',
        application: props.application,
        interfaces: this._interfaces,
        dubboSetting: props.dubboSetting,
      }),
      this._queue,
    );
  }

  private _interfaces: Array<string>;
  private _readyPromise: Promise<void>;
  private _readyResolve: Function;
  private _subscriber: IDubboSubscriber;
  private readonly _queue: Queue;
  private readonly _props: IDubboProps;
  private readonly _middleware: Array<Middleware<RequestContext>>;
  private readonly _service: TDubboService<TService>;

  //========================public method===================
  /**
   * static factory method
   * @param props
   */
  static from(props: IDubboProps) {
    return new Dubbo(props);
  }

  /**
   * get service from dubbo container
   */
  get service() {
    return this._service;
  }

  /**
   * 代理dubbo的服务
   */
  proxyService = <T>(provider: IDubboProvider): T => {
    const {application, isSupportedDubbox, dubboSetting} = this._props;
    const {dubboInterface, methods, timeout} = provider;
    const proxyObj = Object.create(null);

    //collect interface
    this._interfaces.push(dubboInterface);
    //get interface setting such as group, version
    const setting = dubboSetting.getDubboSetting(dubboInterface);
    if (!setting) {
      throw new Error(
        `Could not find any group or version for ${dubboInterface}, Please specify dubboSetting`,
      );
    }

    //proxy methods
    Object.keys(methods).forEach(name => {
      proxyObj[name] = async (...args: any[]) => {
        log('%s create context', name);
        //创建dubbo调用的上下文
        const ctx = RequestContext.create();
        ctx.application = application;
        ctx.isSupportedDubbox = isSupportedDubbox;

        // set dubbo version
        ctx.dubboVersion = this._props.dubboVersion;

        const method = methods[name];
        ctx.methodName = name;
        ctx.methodArgs = method.call(provider, ...args) || [];

        ctx.dubboInterface = dubboInterface;
        ctx.version = setting.version;
        ctx.timeout = timeout;
        ctx.group = setting.group || '';

        const self = this;
        const middlewares = [
          ...this._middleware, //handle request middleware
          async function handleRequest(ctx) {
            log('start middleware handle dubbo request');
            ctx.body = await go(self._queue.add(ctx));
            log('end handle dubbo request');
          },
        ];

        log('middleware->', middlewares);
        const fn = compose(middlewares);

        try {
          await fn(ctx);
        } catch (err) {
          log(err);
        }

        return ctx.body;
      };
    });

    return proxyObj;
  };

  /**
   * extends middleware, api: the same as koa
   * @param fn
   */
  use(fn: Middleware<RequestContext>) {
    if (typeof fn != 'function') {
      throw new TypeError('middleware must be a function');
    }
    log('use middleware %s', (fn as any)._name || fn.name || '-');
    this._middleware.push(fn);
    return this;
  }

  /**
   * dubbo的连接是异步的，有没有连接成功，通常需要到runtime才可以知道
   * 这时候可能会给我们一些麻烦，我们必须发出一个请求才能知道dubbo状态
   * 基于这种场景，我们提供一个方法，来告诉外部，dubbo是不是初始化成功，
   * 这样在node启动的过程中就知道dubbo的连接状态，如果连不上我们就可以
   * 及时的fixed
   *
   * 比如和egg配合起来，egg提供了beforeStart方法
   * 通过ready方法来等待dubbo初始化成功
   *
   * //app.js
   * export default (app: EggApplication) => {
   *   const dubbo = Dubbo.from({....})
   *   app.beforeStart(async () => {
   *     await dubbo.ready();
   *     console.log('dubbo was ready...');
   *   })
   * }
   *
   * 其他的框架类似
   */
  ready() {
    return this._readyPromise;
  }

  subscribe(subscriber: IDubboSubscriber) {
    this._subscriber = subscriber;
    return this;
  }

  //================private method================
  private _initMsgListener() {
    process.nextTick(() => {
      msg
        .addListener('sys:trace', (msg: ITrace) => {
          this._subscriber.onTrace(msg);
        })
        .addListener('sys:ready', () => {
          this._readyResolve();
        });

      traceInfo(`dubbo:bootstrap version => ${packageVersion}`);
    });
  }

  /**
   * 注册服务到dubbo容器中
   * @param service dubbo需要管理的接口服务
   * service style:
   * {[key: string]: (dubbo): T => dubbo.proxyService<T>({...})}
   */
  private _registryService(service: Object) {
    for (let key in service) {
      this._service[key] = service[key](this);
    }
  }
}

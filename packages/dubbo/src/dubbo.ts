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
import config from './config';
import Context from './context';
import queue from './queue';
import Scheduler from './scheduler';
import {to} from './to';
import {
  IDubboProps,
  IDubboProvider,
  IDubboSubscriber,
  IObservable,
  ITrace,
  Middleware,
  TDubboService,
} from './types';
import {msg, noop, traceErr} from './util';
const version = require('../package.json').version;

const log = debug('dubbo:bootstrap');
log('dubbo2.js version :=> %s', version);

//定位没有处理的promise
process.on('unhandledRejection', (reason, p) => {
  log(reason, p);
  traceErr(new Error(reason));
});

/**
 * Dubbo
 *
 * 1. 连接注册中心zookeeper
 * 2. 发起远程dubbo provider的方法调用
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
    this._interfaces = [];
    this._middleware = [];
    this._service = <TDubboService<TService>>{};

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

    this._readyResolve = noop;
    this._subscriber = {
      onTrace: noop,
    };
    //初始化消息监听
    this._initMsgListener();
    //create scheduler
    Scheduler.from({
      zkRoot: props.zkRoot,
      register: props.register,
      application: props.application,
      interfaces: this._interfaces,
    });
  }

  private _interfaces: Array<string>;
  private _readyResolve: Function;
  private _subscriber: IDubboSubscriber;
  private readonly _props: IDubboProps;
  private readonly _middleware: Array<Middleware<Context>>;
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
    const {application, isSupportedDubbox} = this._props;
    const {dubboInterface, methods, version, timeout, group} = provider;
    const proxyObj = Object.create(null);

    //collect interface
    this._interfaces.push(dubboInterface);

    //proxy methods
    Object.keys(methods).forEach(name => {
      proxyObj[name] = async (...args: any[]) => {
        //创建dubbo调用的上下文
        const ctx = Context.create();
        ctx.application = application;
        ctx.isSupportedDubbox = isSupportedDubbox;

        const method = methods[name];
        ctx.methodName = name;
        ctx.methodArgs = method.call(provider, ...args) || [];

        ctx.dubboInterface = dubboInterface;
        ctx.version = version;
        ctx.timeout = timeout;
        ctx.group = group || '';

        const middlewares = [
          ...this._middleware,
          //handle request middleware
          async function handleRequest(ctx) {
            log('start middleware handle dubbo Request');
            ctx.body = await to(queue.add(ctx));
            log('end handle dubbo request');
          },
        ];

        log('middleware->', middlewares);
        const fn = compose(middlewares);

        try {
          await fn(ctx);
        } catch (err) {
          log(err);
          traceErr(err);
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
  use(fn) {
    if (typeof fn != 'function') {
      throw new TypeError('middleware must be a function');
    }
    log('use middleware %s', fn._name || fn.name || '-');
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
    return new Promise(resolve => {
      this._readyResolve = resolve;
    });
  }

  subscribe(subscriber: IDubboSubscriber) {
    this._subscriber = subscriber;
  }

  //================private method================
  private _initMsgListener() {
    process.nextTick(() => {
      this._subscriber.onTrace({
        type: 'INFO',
        msg: `dubbo:bootstrap version => ${version}`,
      });
      msg
        .addListener('sys:trace', (msg: ITrace) => {
          this._subscriber.onTrace(msg);
        })
        .addListener('sys:ready', () => {
          this._readyResolve();
        });
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

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
import {msg, MSG_TYPE} from './msg';
import queue from './queue';
import Scheduler from './scheduler';
import {to} from './to';
import {
  IDubboProps,
  IDubboProvider,
  IDubboSubscriber,
  IObservable,
  Middleware,
} from './types';

const noop = () => {};
const log = debug('dubbo:bootstrap');
const {version} = require('../package.json');
log('dubbo2.js version :=> %s', version);

//定位没有处理的promise
process.on('unhandledRejection', (reason, p) => {
  log(reason, p);
});

/**
 * Dubbo
 * 1. 连接注册中心zookeeper
 * 2. 发起远程dubbo provider的方法调用
 * 3. 序列化/反序列化dubbo协议
 * 4. 管理tcp连接以及心跳
 * 5. 通过代理机制自动代理interface对应的方法
 * 6. 提供直连的方式快速测试接口
 * 7. middleware
 * 8. 通过zone-context可以实现dubbo调用的全链路跟踪
 * 9. 集中消息管理
 */
export default class Dubbo implements IObservable<IDubboSubscriber> {
  constructor(props: IDubboProps) {
    this._props = props;
    this._middleware = [];
    this._readyResolve = noop;
    this._subscriber = {
      onReady: noop,
      onSysError: noop,
      onStatistics: noop,
    };

    const {
      zkRoot,
      register,
      application,
      interfaces,
      dubboInvokeTimeout,
      dubboSocketPool,
    } = this._props;

    if (typeof interfaces === 'undefined' || interfaces.length === 0) {
      log(`dubbo props could not find any interfaces`);
      throw new Error(`dubbo props could not find any interfaces`);
    }

    //初始化config
    config.dubboInvokeTimeout = dubboInvokeTimeout || config.dubboInvokeTimeout;
    config.dubboSocketPool = dubboSocketPool || config.dubboSocketPool;

    //初始化消息监听
    this._initMsgListener();

    log('getting started...');
    log(`initial properties: %O`, props);
    log('config-> %O', config);

    Scheduler.from({
      zkRoot,
      register,
      application,
      interfaces,
    });
  }

  private readonly _props: IDubboProps;
  private _subscriber: IDubboSubscriber;
  private _readyResolve: Function;
  private readonly _middleware: Array<Middleware<Context>>;

  private _initMsgListener() {
    process.nextTick(() => {
      msg
        .addListener(MSG_TYPE.SYS_READY, () => {
          this._readyResolve();
          this._subscriber.onReady();
        })
        .addListener(MSG_TYPE.SYS_ERR, err => {
          this._subscriber.onSysError(err);
        })
        .addListener(MSG_TYPE.SYS_STATISTICS, stat =>
          this._subscriber.onStatistics(stat),
        );
    });
  }

  static from(props: IDubboProps) {
    return new Dubbo(props);
  }

  /**
   * 代理dubbo的服务
   */
  proxyService = <T>(provider: IDubboProvider): T => {
    const {dubboVersion, application} = this._props;
    const {dubboInterface, methods, version, timeout, group} = provider;
    const proxyObj = Object.create(null);

    //proxy methods
    Object.keys(methods).forEach(name => {
      proxyObj[name] = async (...args: any[]) => {
        //创建dubbo调用的上下文
        const ctx = Context.create();
        ctx.application = application;

        const method = methods[name];
        ctx.methodName = name;
        ctx.methodArgs = method.call(provider, ...args) || [];

        ctx.dubboInterface = dubboInterface;
        ctx.dubboVersion = dubboVersion;
        ctx.version = version;
        ctx.timeout = timeout;
        ctx.group = group;

        const middleware = [
          ...this._middleware,
          //handle request middleware
          async function handleRequest(ctx) {
            log('start middleware handle dubbo Request');
            ctx.body = await to(queue.add(ctx));
            log('end handle dubbo request');
          },
        ];

        log('middleware->', middleware);
        const fn = compose(middleware);

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
}

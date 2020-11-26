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
import RequestContext from './request-context';
import {go} from '../common/go';
import {SOCKET_STATUS} from './socket-status';
import SocketWorker from './socket-worker';
import {IDirectlyDubboProps, IHessianType, IInvokeParam} from '../types';

const log = debug('directly-dubbo');

/**
 * 直连dubbo的远程方法，方便快速测试还没有发布到zookeeper的的方法
 * Usage:
 *
const dubbo = DirectlyDubbo.from({
  dubboAddress: 'localhost:20880',
  dubboVersion: '2.0.0',
  dubboInvokeTimeout: 10,
});

const demoService = dubbo.proxyService<IDemoService>({
  dubboInterface: 'com.alibaba.dubbo.demo.DemoService',
  version: '1.0.0',
  methods: {
    sayHello(name) {
      return [java.String(name)];
    },

    echo() {},

    test() {},

    getUserInfo() {
      return [
        java.combine('com.alibaba.dubbo.demo.UserRequest', {
          id: 1,
          name: 'nodejs',
          email: 'node@qianmi.com',
        }),
      ];
    },
  },
});
 */
export default class DirectlyDubbo {
  private constructor(props: IDirectlyDubboProps) {
    log('bootstrap....%O', this._props);
    this._props = props;
    this._queue = new Map();
    this._socketStatus = SOCKET_STATUS.PADDING;
    this._socketWorker = SocketWorker.from(this._props.dubboAddress).subscribe({
      onConnect: this.onConnect,
      onData: this.onData,
      onClose: this.onClose,
    });
  }

  private readonly _props: IDirectlyDubboProps;
  private readonly _socketWorker: SocketWorker;
  private readonly _queue: Map<number, RequestContext>;
  private _socketStatus: SOCKET_STATUS;

  static from(props: IDirectlyDubboProps) {
    return new DirectlyDubbo(props);
  }

  proxyService<T extends Object>(invokeParam: IInvokeParam): T {
    const {
      dubboInterface,
      methods,
      timeout,
      group,
      version,
      attachments = {},
      isSupportedDubbox = false,
    } = invokeParam;
    const proxy = Object.create(null);

    Object.keys(methods).forEach(methodName => {
      proxy[methodName] = (...args: Array<IHessianType>) => {
        return go(
          new Promise((resolve, reject) => {
            const ctx = RequestContext.create();
            ctx.resolve = resolve;
            ctx.reject = reject;

            ctx.methodName = methodName;
            const method = methods[methodName];
            ctx.methodArgs = method.call(invokeParam, ...args) || [];

            ctx.dubboVersion = this._props.dubboVersion;
            ctx.dubboInterface = dubboInterface;
            ctx.path = dubboInterface;
            ctx.group = group;
            ctx.timeout = timeout;
            ctx.version = version;
            ctx.attachments = attachments;
            ctx.isSupportedDubbox = isSupportedDubbox;

            //check param
            //param should be hessian data type
            if (!ctx.isMethodArgsHessianType) {
              log(
                `${dubboInterface} method: ${methodName} not all arguments are valid hessian type`,
              );
              log(`arguments->${JSON.stringify(ctx.methodArgs, null, 2)}`);
              reject(new Error('not all arguments are valid hessian type'));
              return;
            }

            //超时检测
            ctx.timeoutId = setTimeout(() => {
              const {requestId} = ctx;
              log(`${dubboInterface} method: ${methodName} invoke timeout`);
              this.fail(requestId, new Error('remote invoke timeout'));
            }, this._props.dubboInvokeTimeout * 1000);

            //add task to queue
            this.addQueue(ctx);
          }),
        );
      };
    });

    return proxy;
  }

  /**
   * 成功的处理队列的任务
   * @param requestId
   * @param res
   */
  private success(requestId: number, res: any) {
    const ctx = this._queue.get(requestId);
    if (!ctx) {
      return;
    }
    const {resolve} = ctx;
    resolve(res);
    ctx.cleanTimeout();
    this._queue.delete(requestId);
  }

  /**
   * 失败的处理队列的任务
   * @param requestId
   * @param err
   */
  private fail(requestId: number, err: Error) {
    const ctx = this._queue.get(requestId);
    if (!ctx) {
      return;
    }
    const {reject} = ctx;
    reject(err);
    ctx.cleanTimeout();
    this._queue.delete(requestId);
  }

  private addQueue(ctx: RequestContext) {
    const {requestId} = ctx;
    this._queue.set(requestId, ctx);

    log(`current socketworkder=> ${this._socketStatus}`);

    //根据当前socket的worker的状态，来对任务进行处理
    switch (this._socketStatus) {
      case SOCKET_STATUS.PADDING:
        break;
      case SOCKET_STATUS.CONNECTED:
        this._socketWorker.write(ctx);
        break;
      case SOCKET_STATUS.CLOSED:
        this.fail(requestId, new Error(`socket-worker had closed.`));
        break;
    }
  }

  //===================socket event===================
  private onConnect = () => {
    this._socketStatus = SOCKET_STATUS.CONNECTED;

    for (let ctx of this._queue.values()) {
      //如果还没有被处理
      if (ctx.isNotScheduled) {
        this._socketWorker.write(ctx);
      }
    }
  };

  private onData = ({requestId, res, err}) => {
    log(`onData->requestId#${requestId} err?: ${err != null}`);
    err ? this.fail(requestId, err) : this.success(requestId, res);
  };

  private onClose = () => {
    log('socket-worker was closed');
    this._socketStatus = SOCKET_STATUS.CLOSED;
    //failed all
    for (let ctx of this._queue.values()) {
      ctx.reject(new Error('socket-worker was closed.'));
      ctx.cleanTimeout();
    }
    this._queue.clear();
  };
}

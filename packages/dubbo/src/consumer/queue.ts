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
import config from '../common/config';
import RequestContext from './request-context';
import DubboUrl from './dubbo-url';
import {
  DubboMethodParamHessianTypeError,
  DubboTimeoutError,
} from '../common/err';
import SocketWorker from './socket-worker';
import statistics from './statistics';
import {IObservable, TQueueObserver, TRequestId} from '../types';
import {isDevEnv, noop, traceErr} from '../common/util';
import {DEFAULT_DUBBO_PROTOCOL_VERSION} from '../serialization/constants';

const log = debug('dubbo:queue');

/**
 * Node的异步特性就会让我们在思考问题的时候，要转换一下思考问题的思维
 * 无论是zookeeper的连接，还是socket的创建都是异步的特性。
 * 但是请求的incoming的时候，整体可能还没有初始化结束，如果我们试图去阻塞
 * 就会导致整个编程架构很痛苦。
 * 所有简单的处理就是，每次处理请求incoming的时候先把请求参数推入队列，然后
 * 等待后面的资源初始化结束进行处理，如果超过超时时间就自动进行timeout超时处理
 */
export default class Queue implements IObservable<TQueueObserver> {
  private constructor() {
    log('new Queue');
    //调用队列-保持调用的requestId和参数
    this._requestQueue = new Map();
    //订阅者,当有新的dubbo请求添加到队列中，通知schedule进行处理
    this._subscriber = noop;
  }

  //订阅者
  private _subscriber: Function;
  //请求队列
  private readonly _requestQueue: Map<TRequestId, RequestContext>;

  private _clear(requestId) {
    log(`clear invoke and schedule queue #${requestId}`);
    this._requestQueue.delete(requestId);
    if (isDevEnv) {
      log('current schedule queue', this.scheduleQueue);
      this._showStatistics();
    }
  }

  /**
   * static factory method
   */
  static create() {
    return new Queue();
  }

  add = (ctx: RequestContext) => {
    return new Promise((resolve, reject) => {
      ctx.resolve = resolve;
      ctx.reject = reject;

      //hessian参数检测
      if (!Queue._checkMethodArgsHessianType(ctx)) {
        return;
      }
      //timeout超时检测
      this._checkTimeout(ctx);
      //add queue
      const {requestId, dubboInterface} = ctx.request;
      log(`add queue,requestId#${requestId}, interface: ${dubboInterface}`);
      //设置调用队列
      this._requestQueue.set(requestId, ctx);
      if (isDevEnv) {
        log(`current schedule queue =>`, this.scheduleQueue);
      }
      //通知scheduler
      this._subscriber(requestId, ctx);
    });
  };

  /**
   * 获取当前请求队列
   */
  get requestQueue() {
    return this._requestQueue;
  }

  /**
   * 获取当前调度队列
   */
  get scheduleQueue() {
    const schedule = {};
    for (let [requestId, ctx] of this._requestQueue) {
      schedule[requestId] = ctx.pid;
    }
    return schedule;
  }

  subscribe(cb: Function) {
    this._subscriber = cb;
    return this;
  }

  allFailed(err: Error) {
    for (let [requestId, ctx] of this._requestQueue) {
      const {
        reject,
        request: {dubboInterface, methodName},
      } = ctx;
      log(
        'queue schedule failed requestId#%d, %s#%s err: %s',
        requestId,
        dubboInterface,
        methodName,
        err,
      );
      ctx.cleanTimeout();
      reject(err);
    }
    this._requestQueue.clear();
  }

  failed(requestId: TRequestId, err: Error, attachments: Object = {}) {
    const ctx = this._requestQueue.get(requestId);
    if (!ctx) {
      return;
    }

    const {
      uuid,
      request: {dubboInterface, methodName},
    } = ctx;
    log('queue schedule failed requestId#%d, err: %s', requestId, err);
    err.message = `uuid: ${uuid} invoke ${dubboInterface}#${methodName} was error, ${
      err.message
    }`;
    //删除该属性，不然会导致JSON.Stringify失败
    if (err['cause']) {
      delete err['cause']['cause'];
    }
    //dubbo2.6.3
    ctx.providerAttachments = attachments;
    ctx.cleanTimeout();
    ctx.reject(err);
    this._clear(requestId);
  }

  consume(requestId: TRequestId, node: SocketWorker, providerMeta: DubboUrl) {
    const ctx = this._requestQueue.get(requestId);
    if (!ctx) {
      return;
    }
    const {request} = ctx;
    const {dubboInterface, version} = request;
    log(`staring schedule ${requestId}#${dubboInterface}#${version}`);

    //merge dubboVersion timeout group
    request.dubboVersion =
      request.dubboVersion ||
      providerMeta.dubboVersion ||
      DEFAULT_DUBBO_PROTOCOL_VERSION;
    request.group = request.group || providerMeta.group;
    request.path = providerMeta.path;
    try {
      node.write(ctx);
    } catch (err) {
      this.failed(requestId, err);
      traceErr(err);
    }
    if (isDevEnv) {
      log(`current schedule queue ==>`, this.scheduleQueue);
    }
  }

  resolve(requestId: TRequestId, res: any, attachments: Object = {}) {
    const ctx = this._requestQueue.get(requestId);
    if (!ctx) {
      return;
    }
    log('resolve requestId#%d, res: %O', requestId, res);
    //dubbo2.6.3
    ctx.providerAttachments = attachments;
    ctx.cleanTimeout();
    ctx.resolve(res);
    this._clear(requestId);
  }

  private _showStatistics() {
    //调度完成,显示调度结果
    if (this._requestQueue.size === 0) {
      log('invoke statistics==>%o', statistics);
    }
  }

  /**
   * 检测方法参数是不是都是hessian格式
   * @param ctx
   */
  private static _checkMethodArgsHessianType(ctx: RequestContext) {
    if (ctx.isMethodArgsHessianType) {
      return true;
    }

    const {dubboInterface, methodArgs, methodName} = ctx.request;
    statistics.paramCheckErrCount++;

    log(
      `${dubboInterface} method: ${methodName} not all arguments are valid hessian type arguments: => %O`,
      methodArgs,
    );

    ctx.reject(
      new DubboMethodParamHessianTypeError(
        `err: ${dubboInterface}#${methodName} not all arguments are valid hessian type`,
      ),
    );

    return false;
  }

  /**
   * 超时检测
   * @param ctx
   */
  private _checkTimeout(ctx: RequestContext) {
    //先获取上下文设置的超时时间，如果没有设置就获取最大超时时间
    const timeout = (ctx.timeout || config.dubboInvokeTimeout) * 1000;
    log('check timeout: ctx.timeout-> %d @timeout: %d', ctx.timeout, timeout);

    ctx.timeoutId = setTimeout(() => {
      statistics.timeoutErrCount++;
      const {requestId, dubboInterface, methodName} = ctx.request;

      log(`err: ${dubboInterface}#${methodName} remote invoke timeout`);

      this.failed(
        requestId,
        new DubboTimeoutError(
          `err:${dubboInterface}#${methodName} remote invoke timeout`,
        ),
      );
    }, timeout);
  }
}

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
import DubboAgent from './dubbo-agent';
import Queue from './queue';
import {Registry} from '../registry';
import {IDubboResponse} from '../types';
import {traceErr, traceInfo} from '../common/util';
import {ScheduleError, SocketError, ClientTimeoutError} from '../common/err';

const log = debug('dubbo:scheduler');
const enum STATUS {
  PADDING = 'padding',
  READY = 'ready',
  FAILED = 'failded',
  NO_AGENT = 'no_agent',
}

/**
 * scheduler
 * 1. 初始化zookeeper和dubbo-agent
 * 2. 接受所有的socket-worker的事件
 * 3. 处理用户的请求
 * 4. 接受zookeeper的变化，更新dubbo-agent
 */
export default class Scheduler {
  constructor(registry: Registry, queue: Queue) {
    log(`new scheduler`);
    this._status = STATUS.PADDING;

    this._queue = queue;
    this._queue.subscribe(this._handleQueueRequest);

    this._dubboAgent = new DubboAgent();

    //init ZkClient and subscribe
    this._registry = registry.subscribe({
      onData: this._handleClientOnData,
      onError: this._handleClientError,
    });
  }

  private _status: STATUS;
  private _queue: Queue;
  private _registry: Registry;
  private _dubboAgent: DubboAgent;

  /**
   * static factory method
   * @param props
   */
  static from(registry: Registry, queue: Queue) {
    return new Scheduler(registry, queue);
  }

  /**
   * handle request in queue
   * @param requestId
   */
  private _handleQueueRequest = requestId => {
    //record current status
    log(`handle requestId ${requestId}, current status: ${this._status}`);

    switch (this._status) {
      case STATUS.READY:
        //发起dubbo的调用
        this._handleDubboInvoke(requestId);
        break;
      case STATUS.PADDING:
        log('current scheduler was padding');
        break;
      case STATUS.NO_AGENT:
        this._handleFailed(
          requestId,
          new ScheduleError('Zookeeper Can not be find any agents'),
        );
        break;
      case STATUS.FAILED:
        this._handleFailed(
          requestId,
          new ScheduleError('ZooKeeper Could not be connected'),
        );
        break;
    }
  };

  /**
   * 处理zookeeper的数据
   */
  private _handleClientOnData = (agentSet: Set<string>) => {
    //获取负载列表
    log(`get agent address:=> %O`, agentSet);

    //如果负载为空，也就是没有任何provider提供服务
    if (agentSet.size === 0) {
      this._status = STATUS.NO_AGENT;
      //将队列中的所有dubbo调用全调用失败
      const err = new ScheduleError('Can not be find any agents');
      this._queue.allFailed(err);
      traceErr(err);
      return;
    }

    //初始化dubboAgent
    this._dubboAgent.from(agentSet).subscribe({
      onConnect: this._handleOnConnect,
      onData: this._handleOnData,
      onClose: this._handleOnClose,
    });
  };

  /**
   * 处理zookeeper的错误
   */
  private _handleClientError = (err: Error) => {
    log(err);
    traceErr(err);
    //说明zookeeper连接不上
    if (err instanceof ClientTimeoutError) {
      switch (this._status) {
        // 当zk已经初始化完成后, 相应的provider已经找到了, 如果zk这时出现问题, 不应该让provider不允许调用
        case STATUS.READY:
          break;
        default:
          this._status = STATUS.FAILED;
      }
    }
  };

  /**
   * 处理schedule的failed状态
   */
  private _handleFailed = (requestId: number, err: Error) => {
    log('#requestId: %d scheduler was failed, err: %s', requestId, err);
    this._queue.failed(requestId, err);
  };

  /**
   * 发起dubbo调用
   * @param ctx
   * @param agentHostList
   */
  private _handleDubboInvoke(requestId: number) {
    //get request context
    const ctx = this._queue.requestQueue.get(requestId);

    // match any agent?
    const hasAgent = this._registry.hasAgentAddr(ctx);
    if (!hasAgent) {
      const {dubboInterface} = ctx;
      const err = new ScheduleError(
        `requestId#${requestId}:Could not find any agent worker with ${dubboInterface}`,
      );
      this._handleFailed(requestId, err);
      log(err);
      return;
    }

    // get agent addr map
    const agentAddrMap = this._registry.getAgentAddrMap(ctx);

    //get socket agent list
    const agentAddrList = Object.keys(agentAddrMap);
    log('agentAddrSet-> %O', agentAddrList);

    if (agentAddrList.length === 0) {
      const {dubboInterface, version, group} = ctx;
      const msg = `requestId#${requestId} Could not find any match service with ${dubboInterface}#${version}#${group ||
        ''}`;
      const err = new ScheduleError(msg);
      this._handleFailed(requestId, err);
      log(err);
      return;
    }

    const worker = this._dubboAgent.getAvailableSocketWorker(agentAddrList);

    //if could not find any available socket agent worker
    if (!worker) {
      const {dubboInterface, version, group} = ctx;
      const msg = `requestId#${requestId}:Could not find any available agent worker with ${dubboInterface}#${version}#${group} agentList: ${agentAddrList.join(
        ',',
      )}`;
      const err = new ScheduleError(msg);
      this._handleFailed(requestId, err);
      log(err);
      return;
    }

    ctx.invokeHost = worker.host;
    ctx.invokePort = worker.port;

    const providerProps = agentAddrMap[`${ctx.invokeHost}:${ctx.invokePort}`];
    this._queue.consume(ctx.requestId, worker, providerProps);
  }

  private _handleOnConnect = ({pid, host, port}) => {
    log(`scheduler receive socket-worker connect pid#${pid} ${host}:${port}`);
    const agentHost = `${host}:${port}`;
    this._status = STATUS.READY;
    traceInfo(
      `scheduler receive socket-worker connect pid#${pid} ${host}:${port}`,
    );

    for (let ctx of this._queue.requestQueue.values()) {
      if (ctx.isNotScheduled) {
        const agentHostList = Object.keys(this._registry.getAgentAddrMap(ctx));
        log('agentHostList-> %O', agentHostList);
        //当前的socket是否可以处理当前的请求
        if (agentHostList.indexOf(agentHost) != -1) {
          this._handleDubboInvoke(ctx.requestId);
        }
      }
    }
  };

  /**
   * 当收到数据的时候
   */
  private _handleOnData = ({
    requestId,
    res,
    err,
    attachments,
  }: IDubboResponse<any>) => {
    if (err) {
      this._queue.failed(requestId, err, attachments);
    } else {
      this._queue.resolve(requestId, res, attachments);
    }
  };

  /**
   * 处理某一个SocketWorker被关闭的状态
   */
  private _handleOnClose = ({pid}) => {
    log(`socket-worker#${pid} was close`);

    //查询之前哪些接口的方法被pid调用, 然后直接failfast
    const {requestQueue} = this._queue;
    for (let [requestId, ctx] of requestQueue) {
      if (ctx.pid === pid) {
        this._handleFailed(
          requestId,
          new SocketError(`socket-worker#${pid} had closed.`),
        );
      }
    }
  };
}

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
import {ScheduleError, SocketError, ZookeeperTimeoutError} from './err';
import {msg, MSG_TYPE} from './msg';
import queue from './queue';
import serverAgent, {ServerAgent} from './server-agent';
import {IZkClientProps} from './types';
import {ZkClient} from './zookeeper';

const log = debug('dubbo:scheduler');
const enum STATUS {
  PADDING = 'padding',
  READY = 'ready',
  FAILED = 'failded',
}

/**
 * scheduler
 * 1. 初始化zookeeper和socket-agent
 * 2. 接受所有的socket-worker的事件
 * 3. 处理用户的请求
 * 4. 接受zookeeper的变化，更新Server-agent
 */
export default class Scheduler {
  constructor(props: IZkClientProps) {
    log(`new:|> %O`, props);
    //init current status
    this._status = STATUS.PADDING;
    //subscribe queue
    queue.subscribe(this._handleQueueRequest);
    //init ZkClient and subscribe
    this._zkClient = ZkClient.from(props).subscribe({
      onData: this._handleZkClientOnData,
      onError: this._handleZkClientError,
    });
  }

  private _status: STATUS;
  private _zkClient: ZkClient;
  private _serverAgent: ServerAgent;

  /**
   * static factory method
   * @param props
   */
  static from(props: IZkClientProps) {
    return new Scheduler(props);
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
      case STATUS.FAILED:
        this._handleFailed(
          requestId,
          new ScheduleError(
            'Schedule error, ZooKeeper Could not be connected!',
          ),
        );
        break;
    }
  };

  /**
   * 处理zookeeper的数据
   */
  private _handleZkClientOnData = (agentSet: Set<string>) => {
    //获取负载列表
    log(`get agent address:=> %O`, agentSet);

    //如果负载为空，也就是没有任何provider提供服务
    if (agentSet.size === 0) {
      this._status = STATUS.FAILED;
      //将队列中的所有dubbo调用全调用失败
      queue.allFailed(new ScheduleError('Can not be found any agents'));
      return;
    }

    //初始化serverAgent
    this._serverAgent = serverAgent.from(agentSet).subscribe({
      onConnect: this._handleOnConnect,
      onData: this._handleOnData,
      onClose: this._handleOnClose,
    });
  };

  /**
   * 处理zookeeper的错误
   */
  private _handleZkClientError = err => {
    log(err);
    //说明zookeeper连接不上
    if (err instanceof ZookeeperTimeoutError) {
      this._status = STATUS.FAILED;
    }
  };

  /**
   * 处理schedule的failed状态
   */
  private _handleFailed = (requestId: number, err: Error) => {
    log('#requestId: %d scheduler was failed, err: %s', requestId, err);
    queue.failed(requestId, err);
  };

  /**
   * 发起dubbo调用
   * @param ctx
   * @param agentHostList
   */
  private _handleDubboInvoke(requestId: number) {
    //get request context
    const ctx = queue.requestQueue.get(requestId);
    //get socket agent list
    const agentAddrSet = this._zkClient.getAgentAddrList(ctx);
    log('agentAddrSet-> %O', agentAddrSet);

    const worker = this._serverAgent.getAvailableSocketWorker(agentAddrSet);
    //if could not find any available socket agent worker
    if (!worker) {
      const {requestId, dubboInterface, version, group} = ctx;
      const msg = `requestId#${requestId}:Could not find any agent address with ${dubboInterface}#${version}#${group}`;
      log(msg);
      this._handleFailed(requestId, new ScheduleError(msg));
      return;
    }

    ctx.invokeHost = worker.host;
    ctx.invokePort = worker.port;

    const providerProps = this._zkClient.getDubboServiceProp(ctx);
    queue.consume(ctx.requestId, worker, providerProps);
  }

  private _handleOnConnect = ({pid, host, port}) => {
    log(`scheduler receive SocketWorker connect pid#${pid} ${host}:${port}`);
    const agentHost = `${host}:${port}`;
    this._status = STATUS.READY;

    for (let ctx of queue.requestQueue.values()) {
      if (ctx.isNotScheduled) {
        const agentHostList = this._zkClient.getAgentAddrList(ctx);
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
  private _handleOnData = ({requestId, res, err}) => {
    if (err) {
      queue.failed(requestId, err);
    } else {
      queue.resolve(requestId, res);
    }
  };

  /**
   * 处理某一个SocketWorker被关闭的状态
   */
  private _handleOnClose = ({pid}) => {
    log(`SocketWorker#${pid} was close`);

    //查询之前哪些接口的方法被pid调用, 然后直接failfast
    const {requestQueue} = queue;
    for (let [requestId, ctx] of requestQueue) {
      if (ctx.pid === pid) {
        this._handleFailed(
          requestId,
          new SocketError(`SocketWorker#${pid} had closed.`),
        );
      }
    }

    //通知外部
    msg.emit(
      MSG_TYPE.SYS_ERR,
      new SocketError(`SocketWorker#${pid} was close`),
    );
  };
}

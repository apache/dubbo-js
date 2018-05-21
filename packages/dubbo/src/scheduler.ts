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
import queue from './queue';
import serverAgent, {ServerAgent} from './server-agent';
import {IZkClientProps} from './types';
import {ZkClient} from './zookeeper';
import {ScheduleError, SocketError, ZookeeperTimeoutError} from './err';
import Context from './context';
import {msg, MSG_TYPE} from './msg';

const log = debug('dubbo:scheduler');

enum SCHEDULE_STATUS {
  //等待状态
  PADDING,
  //失败状态
  FAILED,
  //OK状态
  READY,
}

/**
 * 调度器
 * 1. 初始化zookeeper和socket-agent
 * 2. 接受所有的socket-worker的事件
 * 3. 处理用户的请求
 * 4. 接受zookeeper的变化，更新Server-agent
 */
export default class Scheduler {
  constructor(props: IZkClientProps) {
    log(`new Scheduler, with %O`, props);
    this._status = SCHEDULE_STATUS.PADDING;
    //监听队列
    queue.subscribe(this._handleQueueSubscribe);
    //初始化ZkClient
    this._zkClient = ZkClient.from(props).subscribe({
      onData: this._handleZkClientOnData,
      onError: this._handleZkClientError,
    });
  }

  private _status: number;
  private _zkClient: ZkClient;
  private _serverAgent: ServerAgent;

  static from(props) {
    return new Scheduler(props);
  }

  /**
   * 处理队列请求
   */
  private _handleQueueSubscribe = requestId => {
    log(
      `handle requestId ${requestId}, status: ${SCHEDULE_STATUS[this._status]}`,
    );
    switch (this._status) {
      case SCHEDULE_STATUS.PADDING:
        log('scheduler was padding');
        break;
      case SCHEDULE_STATUS.FAILED:
        this._scheduleFailed(requestId);
        break;
      case SCHEDULE_STATUS.READY:
        log('scheduler was ready');
        const ctx = queue.requestQueue.get(requestId);
        //获取负载列表
        const agentHostList = this._zkClient.getAgentHostList(ctx);
        log('agentHostList-> %O', agentHostList);
        //如果没有提供者
        if (Scheduler._isNotFoundAgent(ctx, agentHostList)) {
          return;
        }
        //发起dubbo的调用
        this._dubboInvoke(ctx, agentHostList);
        break;
      default:
        break;
    }
  };

  /**
   * 处理zookeeper的数据
   */
  private _handleZkClientOnData = (agentSet: Set<string>) => {
    //获取负载列表
    log(`get agent list:=> %O`, agentSet);

    //如果负载为空，也就是没有任何provider提供服务
    if (agentSet.size === 0) {
      //所有的queue中的全做失败处理
      queue.allFailed(new ScheduleError('Can not find any agent'));
      this._status = SCHEDULE_STATUS.FAILED;
      return;
    }

    //初始化serverAgent
    this._serverAgent = serverAgent.from(agentSet).subscribe({
      onConnect: this._onConnect,
      onData: this._onData,
      onClose: this._onClose,
    });
  };

  /**
   * 处理zookeeper的错误
   */
  private _handleZkClientError = err => {
    log(err);
    //说明zookeeper连接不上
    if (err instanceof ZookeeperTimeoutError) {
      this._status = SCHEDULE_STATUS.FAILED;
    }
  };

  /**
   * 处理schedule的failed状态
   */
  private _scheduleFailed = (requestId: number) => {
    log('scheduler was failed');
    queue.failed(
      requestId,
      new ScheduleError('Schedule error, Zk Could not connect'),
    );
  };

  /**
   * 判断是不是当前调用接口的agentHost是不是为空，如果为空失败处理
   * @param ctx
   * @param agentHost
   */
  private static _isNotFoundAgent(ctx: Context, agentHost: Array<string>) {
    const isNotFound = agentHost.length === 0;

    if (isNotFound) {
      const {requestId, dubboInterface, version, group} = ctx;

      if (agentHost.length === 0) {
        log(
          `Could not find any agentHost with ${dubboInterface}#${version}#${group}`,
        );
        queue.failed(
          requestId,
          new ScheduleError(
            `Could not find any ${dubboInterface} providers with version#${version} group#${group}, May be you should check dubbo object's interfaces :)`,
          ),
        );
      }
    }

    return isNotFound;
  }

  /**
   * 发起dubbo调用
   * @param ctx
   * @param agentHostList
   */
  private _dubboInvoke(ctx: Context, agentHostList: Array<string>) {
    const node = this._serverAgent.getAvailableSocketAgent(agentHostList)
      .worker;

    ctx.invokeHost = node.host;
    ctx.invokePort = node.port;

    const providerProps = this._zkClient.getProviderProps(ctx);
    queue.consume(ctx.requestId, node, providerProps);
  }

  /**
   * 响应ServerAgent的connect事件
   */
  private _onConnect = ({pid, host, port}) => {
    log(`scheduler receive SocketWorker connect pid#${pid} ${host}:${port}`);
    const agentHost = `${host}:${port}`;
    this._status = SCHEDULE_STATUS.READY;

    for (let ctx of queue.requestQueue.values()) {
      if (ctx.isNotScheduled) {
        const agentHostList = this._zkClient.getAgentHostList(ctx);
        log('agentHostList-> %O', agentHostList);

        if (Scheduler._isNotFoundAgent(ctx, agentHostList)) {
          return;
        }

        if (agentHostList.indexOf(agentHost) != -1) {
          this._dubboInvoke(ctx, agentHostList);
        }
      }
    }
  };

  /**
   * 当收到数据的时候
   */
  private _onData = ({requestId, res, err}) => {
    if (err) {
      queue.failed(requestId, err);
    } else {
      queue.resolve(requestId, res);
    }
  };

  /**
   * 处理某一个SocketWorker被关闭的状态
   */
  private _onClose = ({pid}) => {
    log(`SocketWorker#${pid} was close`);

    //通知外部
    msg.emit(
      MSG_TYPE.SYS_ERR,
      new SocketError(`SocketWorker#${pid} was close`),
    );

    //查询之前哪些接口的方法被pid调用
    const {requestQueue} = queue;
    for (let [requestId, ctx] of requestQueue) {
      if (ctx.pid === pid) {
        queue.failed(
          requestId,
          new SocketError(`SocketWorker#${pid} had closed.`),
        );
      }
    }
  };
}

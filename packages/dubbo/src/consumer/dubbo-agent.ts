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
import SocketWorker from './socket-worker';
import {IObservable, ISocketSubscriber, TAgentAddr} from '../types';
import {isDevEnv, noop, traceErr, traceInfo} from '../common/util';

const log = debug('dubbo:dubbo-agent');

/**
 * 机器agent和socket-worker的管理容器
 * Agent可以理解为一台dubbo service的负载
 */
export default class DubboAgent implements IObservable<ISocketSubscriber> {
  constructor() {
    this._serverAgentMap = new Map();
    this._subscriber = {
      onConnect: noop,
      onData: noop,
      onClose: noop,
    };
  }

  private _subscriber: ISocketSubscriber;
  private readonly _serverAgentMap: Map<TAgentAddr, SocketWorker>;

  /**
   * static factor method
   * @param agentAddrList 负载地址列表
   */
  from = (agentAddrs: Set<string>) => {
    log('create-update dubbo-agent :|> %O', agentAddrs);
    //获取负载host:port列表
    process.nextTick(() => {
      for (let agentAddr of agentAddrs) {
        //如果负载中存在该负载，继续下一个
        if (this._serverAgentMap.has(agentAddr)) {
          //when current worker was retry, add retry chance
          const worker = this._serverAgentMap.get(agentAddr);
          if (worker.isRetry) {
            log(`${agentAddr} was retry`);
            //add retry chance
            worker.resetRetry();
          }
          continue;
        }
        traceInfo(`ServerAgent create SocketWorker: ${agentAddr}`);
        const socketWorker = SocketWorker.from(agentAddr).subscribe({
          onConnect: this._subscriber.onConnect,
          onData: this._subscriber.onData,
          onClose: ({host, pid, port}) => {
            //delete close worker
            this._clearCloseWorker(host + ':' + port);
            //notify scheduler
            this._subscriber.onClose({pid});
          },
        });
        this._serverAgentMap.set(agentAddr, socketWorker);
      }
    });

    return this;
  };

  /**
   * 获取可用负载对应的socketWorker
   * @param agentAddrList
   */
  getAvailableSocketWorker(
    agentAddrList: Array<TAgentAddr> = [],
  ): SocketWorker {
    const availableAgentList = this._getAvailableSocketAgents(agentAddrList);
    const len = availableAgentList.length;
    if (len === 0) {
      traceErr(
        new Error(
          `agentAddrList->${agentAddrList.join()} could not find any avaliable socekt worker`,
        ),
      );
      return null;
    } else if (len === 1) {
      return availableAgentList[0];
    } else {
      //match random
      return availableAgentList[Math.floor(Math.random() * len)];
    }
  }

  /**
   * remove close socket-worker from server agent
   */
  private _clearCloseWorker = (agentAddr: string) => {
    //如果全部关闭
    log(`socket-worker#${agentAddr} was closed. delete this socket worker`);
    this._serverAgentMap.delete(agentAddr);
    traceErr(
      new Error(
        `socket-worker#${agentAddr} was closed. delete this socket worker`,
      ),
    );
    if (isDevEnv) {
      log('SocketAgent current agentHost->', this._serverAgentMap.keys());
    }
  };

  subscribe(subscriber: ISocketSubscriber) {
    this._subscriber = subscriber;
    return this;
  }

  /**
   * 查询一组负载可用的agent
   * @param agentAddrList
   */
  private _getAvailableSocketAgents(
    agentAddrList: Array<TAgentAddr>,
  ): Array<SocketWorker> {
    let availableList = [];

    for (let agentAddr of agentAddrList) {
      const socketWorker = this._serverAgentMap.get(agentAddr);
      if (socketWorker && socketWorker.isAvaliable) {
        availableList.push(socketWorker);
      }
    }

    return availableList;
  }
}

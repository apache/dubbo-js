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
import SocketPool from './socket-pool';
import {IObservable, ISocketSubscriber} from './types';
import {isDevEnv, noop, traceErr, traceInfo} from './util';
import {TAgentAddr} from './zookeeper';

const log = debug('dubbo:server-agent');

/**
 * 机器agent和socket-pool的管理容器
 * Agent可以理解为一台dubbo service的负载
 */
export class ServerAgent implements IObservable<ISocketSubscriber> {
  constructor() {
    this._serverAgentMap = new Map();
    this._subscriber = {
      onConnect: noop,
      onData: noop,
      onClose: noop,
    };
  }

  private _subscriber: ISocketSubscriber;
  private readonly _serverAgentMap: Map<TAgentAddr, SocketPool>;

  /**
   * static factor method
   */
  from = (agentAddrs: Set<string>) => {
    log('agerntAddrs: %O', agentAddrs);
    //获取负载host:port列表
    //根据负载创建连接池
    process.nextTick(() => {
      for (let agentAddr of agentAddrs) {
        //如果负载中存在该负载，继续下一个
        if (this._serverAgentMap.has(agentAddr)) {
          continue;
        }
        log(`create ServerAgent: ${agentAddr}`);
        traceInfo(`ServerAgent create socket-pool: ${agentAddr}`);
        const socketPool = SocketPool.from(agentAddr).subscribe({
          onConnect: this._subscriber.onConnect,
          onData: this._subscriber.onData,
          onClose: ({pid, host, port}) => {
            this._clearClosedPool(host + ':' + port);
            this._subscriber.onClose({pid});
          },
        });
        this._serverAgentMap.set(agentAddr, socketPool);
      }
    });

    return this;
  };

  /**
   * 获取可用负载对应的socketWorker
   * @param agentAddrList
   */
  getAvailableSocketWorker(agentAddrList: Array<TAgentAddr>) {
    const availableAgentList = this._getAvailableSocketAgents(agentAddrList);
    const len = availableAgentList.length;

    if (len === 0) {
      return null;
    } else if (len === 1) {
      return availableAgentList[0].worker;
    } else {
      return availableAgentList[Math.floor(Math.random() * len)].worker;
    }
  }

  private _clearClosedPool = (agentAddr: string) => {
    const socketPool = this._serverAgentMap.get(agentAddr);
    if (socketPool.isAllClose) {
      //如果全部关闭
      log(
        `${agentAddr}'s pool socket-worker had all closed. delete ${agentAddr}`,
      );
      this._serverAgentMap.delete(agentAddr);
      traceErr(
        new Error(
          `${agentAddr}'s pool socket-worker had all closed. delete ${agentAddr}`,
        ),
      );
    }
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
  ): Array<SocketPool> {
    let availableList = [];
    for (let agentAddr of agentAddrList) {
      const socketPool = this._serverAgentMap.get(agentAddr);
      if (socketPool && socketPool.hasAvaliableNodes) {
        availableList.push(socketPool);
      }
    }
    return availableList;
  }
}

export default new ServerAgent();

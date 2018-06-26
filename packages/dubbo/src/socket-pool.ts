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
import config from './config';
import {SOCKET_STATUS} from './socket-status';
import {default as SocketNode, default as SocketWorker} from './socket-worker';
import {IObservable, ISocketSubscriber} from './types';
import {noop, traceInfo} from './util';

const log = debug('dubbo:socket-pool');

/**
 * Socket池容器
 */
export default class SocketPool implements IObservable<ISocketSubscriber> {
  constructor(props: {url: string; poolSize: number}) {
    log(`new:|> ${JSON.stringify(props, null, 2)}`);
    traceInfo(`socket-pool: ${props.url} poolSize: ${props.poolSize}`);

    this._socketPool = [];
    this._isInitEnd = false;

    this._url = props.url;
    this._poolSize =
      props.poolSize < 0 ? config.dubboSocketPool : props.poolSize;

    this._subscriber = {
      onConnect: noop,
      onData: noop,
      onClose: noop,
    };

    process.nextTick(() => {
      this._init();
    });
  }

  private _url: string;
  private readonly _poolSize: number;
  private _isInitEnd: boolean;
  private _socketPool: Array<SocketNode>;
  private _subscriber: ISocketSubscriber;

  static from(url: string, poolSize: number = config.dubboSocketPool) {
    return new SocketPool({
      url,
      poolSize,
    });
  }

  get isAllClose() {
    return (
      this._isInitEnd &&
      this._socketPool.every(worker => worker.status === SOCKET_STATUS.CLOSED)
    );
  }

  get hasAvaliableNodes() {
    return this._isInitEnd && this.availableWorkers.length > 0;
  }

  get availableWorkers() {
    return this._socketPool.filter(
      worker => worker.status === SOCKET_STATUS.CONNECTED,
    );
  }

  get worker() {
    const worker = this.availableWorkers;
    const len = worker.length;

    if (len === 1) {
      return worker[0];
    }

    return worker[Math.floor(Math.random() * worker.length)];
  }

  subscribe(subscriber: ISocketSubscriber) {
    this._subscriber = subscriber;
    return this;
  }

  private _init = () => {
    for (let i = 0; i < this._poolSize; i++) {
      this._socketPool.push(
        SocketWorker.from(this._url).subscribe(this._subscriber),
      );
    }

    this._isInitEnd = true;
  };
}

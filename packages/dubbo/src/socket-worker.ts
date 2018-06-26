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
import net from 'net';
import Context from './context';
import {decode} from './decode';
import DecodeBuffer from './decode-buffer';
import DubboEncoder from './encode';
import HeartBeat from './heartbeat';
import {SOCKET_STATUS} from './socket-status';
import statistics from './statistics';
import {IObservable, ISocketSubscriber} from './types';
import {noop, traceErr, traceInfo} from './util';

let pid = 0;
//重试次数
const RETRY_NUM = 6;
//重试评率
const RETRY_TIME = 5000;
//心跳频率
const HEART_BEAT = 180 * 1000;
const log = debug('dubbo:socket-worker');

/**
 * 具体处理tcp底层通信的模块
 * 1 负责socket的创建和通信
 * 2.负责dubbo的序列化和反序列化
 * 3.socket断开自动重试
 */
export default class SocketWorker implements IObservable<ISocketSubscriber> {
  constructor(host: string, port: number) {
    this.pid = ++pid;
    statistics['pid#' + this.pid] = 0;

    this.host = host;
    this.port = port;
    this._retry = RETRY_NUM;
    this._status = SOCKET_STATUS.PADDING;

    log('new SocketWorker#%d|> %s %s', pid, host + ':' + port, this._status);
    traceInfo(`new SocketWorker#${this.pid} |> ${host + ':' + port}`);

    this._subscriber = {
      onConnect: noop,
      onData: noop,
      onClose: noop,
    };

    this._decodeBuff = DecodeBuffer.from(pid).subscribe(
      this._onSubscribeDecodeBuff,
    );

    this._initSocket();
  }

  public readonly pid: number;
  public readonly host: string;
  public readonly port: number;

  private _retry: number;
  private _retryInterval: NodeJS.Timer;
  private _heartBeatTimer: NodeJS.Timer;
  private _socket: net.Socket;
  private _status: SOCKET_STATUS;
  private _decodeBuff: DecodeBuffer;
  private _subscriber: ISocketSubscriber;

  //====================================public method==========================
  static from(url: string) {
    const [host, port] = url.split(':');
    return new SocketWorker(host, Number(port));
  }

  write(ctx: Context) {
    if (this.status === SOCKET_STATUS.CONNECTED) {
      log(`SocketWorker#${this.pid} =invoked=> ${ctx.requestId}`);
      statistics['pid#' + this.pid] = ++statistics['pid#' + this.pid];
      ctx.pid = this.pid;
      const encoder = new DubboEncoder(ctx);
      this._socket.write(encoder.encode());
    }
  }

  get status() {
    return this._status;
  }

  subscribe(subscriber: ISocketSubscriber) {
    this._subscriber = subscriber;
    return this;
  }

  //==========================private method================================
  private _initSocket() {
    log(`SocketWorker#${this.pid} =connecting=> ${this.host}:${this.port}`);
    traceInfo(
      `SocketWorker#${this.pid} =connecting=> ${this.host}:${this.port}`,
    );

    this._socket = new net.Socket();
    this._socket
      .connect(
        this.port,
        this.host,
        this._onConnected,
      )
      .on('data', this._onData)
      .on('error', this._onError)
      .on('close', this._onClose);
  }

  private _onConnected = () => {
    log(`SocketWorker#${this.pid} <=connected=> ${this.host}:${this.port}`);
    traceInfo(
      `SocketWorker#${this.pid} <=connected=> ${this.host}:${this.port}`,
    );

    this._status = SOCKET_STATUS.CONNECTED;

    //reset retry number
    this._retry = RETRY_NUM;
    clearInterval(this._retryInterval);
    this._retryInterval = null;

    //notifiy subscriber, the socketworker was connected successfully
    this._subscriber.onConnect({
      pid: this.pid,
      host: this.host,
      port: this.port,
    });

    //heartbeart
    this._heartBeatTimer = setInterval(() => {
      log('emit heartbeat');
      this._socket.write(HeartBeat.encode());
    }, HEART_BEAT);
  };

  private _onData = data => {
    log(`SocketWorker#${this.pid}  =receive data=> ${this.host}:${this.port}`);
    this._decodeBuff.receive(data);
  };

  private _onError = error => {
    log(`SocketWorker#${this.pid} <=occur error=> ${this.host}:${this.port}`);
    log(error);
    traceErr(error);
    clearInterval(this._heartBeatTimer);
  };

  private _onClose = () => {
    log(
      `SocketWorker#${this.pid} <=closed=> ${this.host}:${this.port} retry: ${
        this._retry
      }`,
    );

    traceErr(
      new Error(
        `SocketWorker#${this.pid} <=closed=> ${this.host}:${this.port} retry: ${
          this._retry
        }`,
      ),
    );

    this._status = SOCKET_STATUS.RETRY;
    clearInterval(this._heartBeatTimer);

    if (this._retry > 0) {
      if (!this._retryInterval) {
        //clear decodebuffer
        this._decodeBuff.clearBuffer();
        //set retry interval
        this._retryInterval = setInterval(() => {
          this._initSocket();
          this._retry--;
        }, RETRY_TIME);
      }
    } else {
      //clear
      clearInterval(this._retryInterval);
      //set state closed and notified socket-pool
      this._status = SOCKET_STATUS.CLOSED;
      this._subscriber.onClose({
        pid: this.pid,
        host: this.host,
        port: this.port,
      });
    }
  };

  private _onSubscribeDecodeBuff = (data: Buffer) => {
    //反序列化dubbo
    const json = decode(data);
    log(`SocketWorker#${this.pid} <=received=> dubbo result %O`, json);
    this._subscriber.onData(json);
  };
}

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
import DecodeBuffer, {DataType} from './decode-buffer';
import DubboEncoder from './encode';
import HeartBeat from './heartbeat';
import {SOCKET_STATUS} from './socket-status';
import statistics from './statistics';
import {IObservable, ISocketSubscriber} from './types';
import {noop} from './util';

let pid = 0;
//重试次数
const RETRY_NUM = 20;
//重试频率
const RETRY_TIME = 3000;
//心跳频率
const HEART_BEAT = 180 * 1000;
const RETRY_HEARD_BEAT_TIME = 20;
const log = debug('dubbo:socket-worker');

/**
 * 具体处理tcp底层通信的模块
 * 1 负责socket的创建和通信
 * 2.负责dubbo的序列化和反序列化
 * 3.socket断开自动重试
 */
export default class SocketWorker implements IObservable<ISocketSubscriber> {
  private constructor(host: string, port: number) {
    this.pid = ++pid;
    //statistics info
    statistics['pid#' + this.pid] = 0;

    this.host = host;
    this.port = port;
    this._retry = RETRY_NUM;
    this._retryHeartBeat = RETRY_HEARD_BEAT_TIME;
    this._status = SOCKET_STATUS.PADDING;

    log('new SocketWorker#%d|> %s %s', pid, host + ':' + port, this._status);
    // traceInfo(`new SocketWorker#${this.pid} |> ${host + ':' + port}`);

    //init subscriber
    this._subscriber = {
      onConnect: noop,
      onData: noop,
      onClose: noop,
    };

    //init decodeBuffer
    this._decodeBuff = DecodeBuffer.from(pid).subscribe(
      this._onSubscribeDecodeBuff,
    );

    //init socket
    this._initSocket();
  }

  public readonly pid: number;
  public readonly host: string;
  public readonly port: number;

  private _retry: number;
  private _retryTimeoutId: NodeJS.Timer;
  private _retryHeartBeat: number;
  private _heartBeatTimer: NodeJS.Timer;
  private _socket: net.Socket;
  private _status: SOCKET_STATUS;
  private _decodeBuff: DecodeBuffer;
  private _subscriber: ISocketSubscriber;

  //==================================public method==========================

  /**
   * static factory method
   * @param url(host:port)
   */
  static from(url: string) {
    const [host, port] = url.split(':');
    return new SocketWorker(host, Number(port));
  }

  /**
   * send data to dubbo service
   * @param ctx dubbo context
   */
  write(ctx: Context) {
    log(`SocketWorker#${this.pid} =invoked=> ${ctx.requestId}`);
    statistics['pid#' + this.pid] = ++statistics['pid#' + this.pid];

    //current dubbo context record the pid
    //when current worker close, fail dubbo request
    ctx.pid = this.pid;
    const encoder = new DubboEncoder(ctx);
    this._socket.write(encoder.encode());
  }

  get status() {
    return this._status;
  }

  /**
   * current status is whether avaliable or not
   */
  get isAvaliable() {
    return this._status === SOCKET_STATUS.CONNECTED;
  }

  /**
   * current status whether retry or not
   */
  get isRetry() {
    return this._status === SOCKET_STATUS.RETRY;
  }

  /**
   * reset retry number
   */
  resetRetry() {
    this._retry = RETRY_NUM;
    if (this._status === SOCKET_STATUS.CLOSED) {
      this._initSocket();
    }
  }

  /**
   * subscribe the socket worker events
   * @param subscriber
   */
  subscribe(subscriber: ISocketSubscriber) {
    this._subscriber = subscriber;
    return this;
  }

  //==========================private method================================
  private _initSocket() {
    log(`SocketWorker#${this.pid} =connecting=> ${this.host}:${this.port}`);
    // traceInfo(
    //   `SocketWorker#${this.pid} =connecting=> ${this.host}:${this.port}`,
    // );

    if (this._socket) {
      this._socket.destroy();
    }

    this._socket = new net.Socket();
    // Disable the Nagle algorithm.
    // this._socket.setTimeout(10 * 1000)
    // this._socket.setKeepAlive(true)
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
    // traceInfo(
    //   `SocketWorker#${this.pid} <=connected=> ${this.host}:${this.port}`,
    // );

    //set current status
    this._status = SOCKET_STATUS.CONNECTED;

    //reset retry number
    this._retry = RETRY_NUM;
    this._retryHeartBeat = RETRY_HEARD_BEAT_TIME;

    //notifiy subscriber, the socketworker was connected successfully
    this._subscriber.onConnect({
      pid: this.pid,
      host: this.host,
      port: this.port,
    });

    //heartbeart
    //when network is close, the connection maybe not close, so check the heart beat times
    this._heartBeatTimer = setInterval(() => {
      if (this._retryHeartBeat > 0) {
        log('emit heartbeat');
        this._retryHeartBeat--;
        this._socket.write(HeartBeat.encode());
      } else {
        this._onClose(false);
      }
    }, HEART_BEAT);
  };

  private _onData = data => {
    log(`SocketWorker#${this.pid}  =receive data=> ${this.host}:${this.port}`);
    const dataType = this._decodeBuff.receive(data);
    switch (dataType) {
      case DataType.HeardBeat:
        this._retryHeartBeat = RETRY_HEARD_BEAT_TIME; //reset heart beat times
        break;
    }
  };

  private _onError = (error: Error) => {
    log(
      `SocketWorker#${this.pid} <=occur error=> ${this.host}:${
        this.port
      } ${error}`,
    );
    // traceErr(
    //   new Error(
    //     `SocketWorker#${this.pid} <=occur error=> ${this.host}:${this.port} ${
    //       error.message
    //     }`,
    //   ),
    // );
    clearInterval(this._heartBeatTimer);
  };

  private _onClose = (hadError: boolean) => {
    log(
      `SocketWorker#${this.pid} <=closed=> ${this.host}:${
        this.port
      } hasError: ${hadError} retry: ${this._retry}`,
    );

    // traceErr(
    //   new Error(
    //     `SocketWorker#${this.pid} <=closed=> ${this.host}:${
    //       this.port
    //     } hadError: ${hadError} retry: ${this._retry}`,
    //   ),
    // );

    //clear buffer
    this._decodeBuff.clearBuffer();
    clearInterval(this._heartBeatTimer);

    if (this._retry > 0) {
      //set current status
      this._status = SOCKET_STATUS.RETRY;
      //retry when delay RETRY_TIME
      clearTimeout(this._retryTimeoutId);
      this._retryTimeoutId = setTimeout(() => {
        this._retry--;
        this._initSocket();
      }, RETRY_TIME);
    } else {
      this._status = SOCKET_STATUS.CLOSED;
      this._socket.destroy();
      //set state closed and notified socket-pool
      this._subscriber.onClose({
        pid: this.pid,
        host: this.host,
        port: this.port,
      });
    }
  };

  private _onSubscribeDecodeBuff = (data: Buffer) => {
    const json = decode(data);
    log(`SocketWorker#${this.pid} <=received=> dubbo result %O`, json);
    this._subscriber.onData(json);
  };
}

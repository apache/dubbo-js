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
import {Socket} from 'net';
import {noop} from '../common/util';
import {IHeartBeatProps} from '../types';

const log = debug('dubbo:heartbeat');

//dubbo的序列化协议
//com.alibaba.dubbo.remoting.exchange.codec.ExchangeCodec
//encodeRequest

//header length
const DUBBO_HEADER_LENGTH = 16;
// magic header.
const DUBBO_MAGIC_HEADER = 0xdabb;
// message flag.
const FLAG_REQUEST = 0x80;
const FLAG_TWOWAY = 0x40;
const FLAG_EVENT = 0x20;

//心跳频率
const HEART_BEAT = 60 * 1000;
// retry heartbeat
const RETRY_HEARD_BEAT_TIME = 3;

//com.alibaba.dubbo.common.serialize.support.hessian.Hessian2Serialization中定义
const HESSIAN2_SERIALIZATION_CONTENT_ID = 2;

/**
 * Heartbeat Manager
 */
export default class HeartBeat {
  private _label: string;
  private _transport: Socket;
  private _onTimeout: Function;
  private _heartBeatTimer: NodeJS.Timer;
  private _lastReadTimestamp: number = -1;
  private _lastWriteTimestamp: number = -1;

  constructor(props: IHeartBeatProps) {
    const {transport, onTimeout, label} = props;
    this._transport = transport;
    this._onTimeout = onTimeout || noop;
    this._label = label;

    // init heartbaet
    this.init();
  }

  // ==========================private method=====================================

  private init = () => {
    // init read/write timestamp
    this.setWriteTimestamp();
    this.setReadTimestamp();

    //heartbeart
    //when network is close, the connection maybe not close, so check the heart beat times
    this._heartBeatTimer = setInterval(() => {
      const now = Date.now();
      if (now - this._lastReadTimestamp > HEART_BEAT * RETRY_HEARD_BEAT_TIME) {
        this._onTimeout();
      } else if (
        now - this._lastWriteTimestamp > HEART_BEAT ||
        now - this._lastReadTimestamp > HEART_BEAT
      ) {
        log(`${this._label} emit heartbeat`);
        this.setWriteTimestamp();
        this._transport.write(HeartBeat.encode());
      }
    }, HEART_BEAT);

    this._transport
      .on('data', () => {
        this.setReadTimestamp();
      })
      .on('close', () => {
        this.destroy();
      });
  };

  private destroy = () => {
    clearTimeout(this._heartBeatTimer);
    this._transport = null;
    this._lastReadTimestamp = -1;
    this._lastWriteTimestamp = -1;
  };

  private setReadTimestamp() {
    this._lastReadTimestamp = Date.now();
  }

  private setWriteTimestamp() {
    this._lastWriteTimestamp = Date.now();
  }

  // ========================static method=============================
  static from(props: IHeartBeatProps) {
    return new HeartBeat(props);
  }

  static encode(): Buffer {
    log('encode heartbeat');

    const buffer = Buffer.alloc(DUBBO_HEADER_LENGTH + 1);

    //magic header
    buffer[0] = DUBBO_MAGIC_HEADER >>> 8;
    buffer[1] = DUBBO_MAGIC_HEADER & 0xff;

    // set request and serialization flag.
    buffer[2] =
      FLAG_REQUEST |
      HESSIAN2_SERIALIZATION_CONTENT_ID |
      FLAG_TWOWAY |
      FLAG_EVENT;

    //set request id
    //暂时不设置

    //set body length
    buffer[15] = 1;

    //body new Hessian.EncoderV2().write(null);
    buffer[16] = 0x4e;

    return buffer;
  }

  //com.alibaba.dubbo.remoting.exchange.codec.ExchangeCodec.decodeBody
  static isHeartBeat(buf: Buffer) {
    //获取标记位
    const flag = buf[2];
    return (flag & FLAG_EVENT) !== 0;
  }
}

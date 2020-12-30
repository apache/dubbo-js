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
import Hessian from 'hessian.js';
import {noop} from '../common/util';
import {IHeartBeatProps} from '../types';

import {
  DUBBO_FLAG_REQUEST,
  DUBBO_FLAG_TWOWAY,
  DUBBO_HEADER_LENGTH,
  DUBBO_FLAG_EVENT,
  HESSIAN2_SERIALIZATION_CONTENT_ID,
  DUBBO_MAGIC_HIGH,
  DUBBO_MAGIC_LOW,
} from './constants';

const log = debug('dubbo:heartbeat');

// Reference
//com.alibaba.dubbo.remoting.exchange.codec.ExchangeCodec
//encodeRequest

//心跳频率
const HEART_BEAT = 60 * 1000;
// retry heartbeat
const RETRY_HEARD_BEAT_TIME = 3;

/**
 * Heartbeat Manager
 */
export default class HeartBeat {
  private _type: 'request' | 'response';
  private _transport: Socket;
  private _onTimeout: Function;
  private _heartBeatTimer: NodeJS.Timer;
  private _lastReadTimestamp: number = -1;
  private _lastWriteTimestamp: number = -1;

  constructor(props: IHeartBeatProps) {
    const {transport, onTimeout, type} = props;
    this._type = type;
    this._transport = transport;
    this._onTimeout = onTimeout || noop;

    const who = this._type === 'request' ? 'dubbo-consumer' : 'dubbo-server';
    log('%s init heartbeat manager', who);

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
        this.emit();
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

  emit() {
    const who = this._type === 'request' ? 'dubbo-consumer' : 'dubbo-server';
    log(`${who} emit heartbeat`);
    this.setWriteTimestamp();
    this._transport.write(this.encode());
  }

  private destroy = () => {
    clearTimeout(this._heartBeatTimer);
    this._transport = null;
    this._lastReadTimestamp = -1;
    this._lastWriteTimestamp = -1;
  };

  setReadTimestamp() {
    this._lastReadTimestamp = Date.now();
  }

  setWriteTimestamp() {
    this._lastWriteTimestamp = Date.now();
  }

  // ========================static method=============================
  static from(props: IHeartBeatProps) {
    return new HeartBeat(props);
  }
  /**
   * encode heartbeat
   */
  encode(): Buffer {
    const who = this._type === 'request' ? 'dubbo-consumer' : 'dubbo-server';
    log('%s encode heartbeat', who);

    const buffer = Buffer.alloc(DUBBO_HEADER_LENGTH + 1);

    //magic header
    buffer[0] = DUBBO_MAGIC_HIGH;
    buffer[1] = DUBBO_MAGIC_LOW;

    // set request and serialization flag.

    if (this._type === 'request') {
      buffer[2] =
        DUBBO_FLAG_REQUEST |
        HESSIAN2_SERIALIZATION_CONTENT_ID |
        DUBBO_FLAG_TWOWAY |
        DUBBO_FLAG_EVENT;
    } else if (this._type === 'response') {
      buffer[2] =
        HESSIAN2_SERIALIZATION_CONTENT_ID |
        DUBBO_FLAG_TWOWAY |
        DUBBO_FLAG_EVENT;
    }

    //set request id
    //暂时不设置

    //set body length
    buffer[15] = 1;

    //body
    // new Hessian.EncoderV2().write(null);
    buffer[16] = 0x4e;

    return buffer;
  }

  //com.alibaba.dubbo.remoting.exchange.codec.ExchangeCodec.decodeBody
  static isHeartBeat(buf: Buffer) {
    // get flag position
    const flag = buf[2];
    if ((flag & DUBBO_FLAG_EVENT) !== 0) {
      const decoder = new Hessian.DecoderV2(buf.slice(DUBBO_HEADER_LENGTH));
      const data = decoder.read();
      return data === null;
    }
    return false;
  }
}

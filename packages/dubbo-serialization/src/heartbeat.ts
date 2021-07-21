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

import debug from 'debug'
import { Socket } from 'net'
import Hessian from 'hessian.js'
import { util } from 'apache-dubbo-common'
import {
  DUBBO_FLAG_REQUEST,
  DUBBO_FLAG_TWOWAY,
  DUBBO_HEADER_LENGTH,
  DUBBO_FLAG_EVENT,
  HESSIAN2_SERIALIZATION_CONTENT_ID,
  DUBBO_MAGIC_HIGH,
  DUBBO_MAGIC_LOW
} from './constants'
import { IHeartBeatProps } from './types'

const log = debug('dubbo:heartbeat')

// Reference
//com.alibaba.dubbo.remoting.exchange.codec.ExchangeCodec
//encodeRequest

//心跳频率
const HEART_BEAT = 60 * 1000
// retry heartbeat
const RETRY_HEARD_BEAT_TIME = 3

/**
 * Heartbeat Manager
 */
export default class HeartBeat {
  private readonly type: 'request' | 'response'
  private readonly onTimeout: Function
  private transport: Socket
  private heartBeatTimer: NodeJS.Timer
  private lastReadTimestamp: number = -1
  private lastWriteTimestamp: number = -1

  constructor(props: IHeartBeatProps) {
    const { transport, onTimeout, type } = props
    this.type = type
    this.transport = transport
    this.onTimeout = onTimeout || util.noop

    const who = this.type === 'request' ? 'dubbo-consumer' : 'dubbo-server'
    log('%s init heartbeat manager', who)

    // init heartbeat
    this.init()
  }

  // ==========================private method=====================================

  private init = () => {
    // init read/write timestamp
    this.setWriteTimestamp()
    this.setReadTimestamp()

    //heartbeat
    //when network is close, the connection maybe not close, so check the heart beat times
    this.heartBeatTimer = setInterval(() => {
      const now = Date.now()
      if (now - this.lastReadTimestamp > HEART_BEAT * RETRY_HEARD_BEAT_TIME) {
        this.onTimeout()
      } else if (
        now - this.lastWriteTimestamp > HEART_BEAT ||
        now - this.lastReadTimestamp > HEART_BEAT
      ) {
        this.emit()
      }
    }, HEART_BEAT)

    this.transport
      .on('data', () => {
        this.setReadTimestamp()
      })
      .on('close', () => {
        this.destroy()
      })
  }

  emit() {
    const who = this.type === 'request' ? 'dubbo-consumer' : 'dubbo-server'
    log(`${who} emit heartbeat`)
    this.setWriteTimestamp()
    this.transport.write(this.encode())
  }

  private destroy = () => {
    clearTimeout(this.heartBeatTimer)
    this.transport = null
    this.lastReadTimestamp = -1
    this.lastWriteTimestamp = -1
  }

  setReadTimestamp() {
    this.lastReadTimestamp = Date.now()
  }

  setWriteTimestamp() {
    this.lastWriteTimestamp = Date.now()
  }

  // ========================static method=============================
  static from(props: IHeartBeatProps) {
    return new HeartBeat(props)
  }
  /**
   * encode heartbeat
   */
  encode(): Buffer {
    const who = this.type === 'request' ? 'dubbo-consumer' : 'dubbo-server'
    log('%s encode heartbeat', who)

    const buffer = Buffer.alloc(DUBBO_HEADER_LENGTH + 1)

    //magic header
    buffer[0] = DUBBO_MAGIC_HIGH
    buffer[1] = DUBBO_MAGIC_LOW

    // set request and serialization flag.

    if (this.type === 'request') {
      buffer[2] =
        DUBBO_FLAG_REQUEST |
        HESSIAN2_SERIALIZATION_CONTENT_ID |
        DUBBO_FLAG_TWOWAY |
        DUBBO_FLAG_EVENT
    } else if (this.type === 'response') {
      buffer[2] =
        HESSIAN2_SERIALIZATION_CONTENT_ID | DUBBO_FLAG_TWOWAY | DUBBO_FLAG_EVENT
    }

    //set request id
    //暂时不设置

    //set body length
    buffer[15] = 1

    //body
    // new Hessian.EncoderV2().write(null);
    buffer[16] = 0x4e

    return buffer
  }

  //com.alibaba.dubbo.remoting.exchange.codec.ExchangeCodec.decodeBody
  static isHeartBeat(buf: Buffer) {
    // get flag position
    const flag = buf[2]
    if ((flag & DUBBO_FLAG_EVENT) !== 0) {
      const decoder = new Hessian.DecoderV2(buf.slice(DUBBO_HEADER_LENGTH))
      const data = decoder.read()
      return data === null
    }
    return false
  }
}

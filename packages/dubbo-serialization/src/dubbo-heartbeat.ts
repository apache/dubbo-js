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
import Hessian from 'hessian.js'
import { d$ } from 'apache-dubbo-common'
import { IHeartBeatProps } from './types'
import ByteBuffer from './byte-buffer'

const log = debug('dubbo:heartbeat')

// Reference
// com.alibaba.dubbo.remoting.exchange.codec.ExchangeCodec#encodeRequest

// 心跳频率
const HEART_BEAT = 60 * 1000
// retry heartbeat
const RETRY_HEARD_BEAT_TIME = 3

/**
 * Heartbeat Manager
 */
export default class HeartBeat {
  private readonly prop: IHeartBeatProps
  private heartBeatTimer: NodeJS.Timer

  private lastReadTimestamp: number = -1
  private lastWriteTimestamp: number = -1

  constructor(prop: IHeartBeatProps) {
    this.prop = prop
    log('%s init heartbeat manager', this.prop.type)
    this.init()
  }

  /**
   * static factory method
   * @param props
   * @returns
   */
  static from(props: IHeartBeatProps) {
    return new HeartBeat(props)
  }

  /**
   * isHeartBeat
   * @param buf
   * @returns
   */
  static isHeartBeat(buf: Buffer) {
    // get flag position
    const flag = buf[2]

    // is heartbeat flag
    if ((flag & d$.DUBBO_FLAG_EVENT) !== 0) {
      const decoder = new Hessian.DecoderV2(buf.slice(d$.DUBBO_HEADER_LENGTH))
      return decoder.read() === null
    }

    return false
  }

  /**
   * emit heartbeat
   */
  emit() {
    log(`emit heartbeat`)
    this.setWriteTimestamp()
    this.prop.transport.write(this.encode())
  }

  /**
   * set read time stamp
   */
  setReadTimestamp() {
    this.lastReadTimestamp = Date.now()
  }

  /**
   * set write timestamp
   */
  setWriteTimestamp() {
    this.lastWriteTimestamp = Date.now()
  }

  /**
   * encode heartbeat
   */
  private encode(): Buffer {
    log('%s encode heartbeat', this.prop.type)
    return (
      new ByteBuffer({ defaultAllocSize: d$.DUBBO_HEADER_LENGTH + 1 })
        // set magic header
        .writeShort(d$.DUBBO_MAGIC_HEADER)
        // set request and serialization flag.
        .writeByte(
          this.prop.type === 'client' ? this.requestFlag : this.responseFlag
        )
        // set request id
        .writeLong(0, { unsigned: true })
        // set body length
        .writeInt(1, { unsigned: true })
        // body =  new Hessian.EncoderV2().write(null); // 0x4e
        .writeByte(0x4e)
        .buffer()
    )
  }

  /**
   * heartbeat request flag
   */
  private get requestFlag() {
    return (
      d$.DUBBO_FLAG_REQUEST |
      d$.HESSIAN2_SERIALIZATION_CONTENT_ID |
      d$.DUBBO_FLAG_TWOWAY |
      d$.DUBBO_FLAG_EVENT
    )
  }

  /**
   * heartbeat response flag
   */
  private get responseFlag() {
    return (
      d$.HESSIAN2_SERIALIZATION_CONTENT_ID |
      d$.DUBBO_FLAG_TWOWAY |
      d$.DUBBO_FLAG_EVENT
    )
  }

  /**
   * init heartbeat
   */
  private init = () => {
    this.setWriteTimestamp()
    this.setReadTimestamp()

    // listen transport event
    this.prop.transport
      .on('data', this.setReadTimestamp)
      .on('close', this.destroy)

    // set heartbeat interval
    this.heartBeatTimer = setInterval(() => {
      const now = Date.now()
      const maxTimeout = HEART_BEAT * RETRY_HEARD_BEAT_TIME

      // is timeout
      const isTimeout = now - this.lastReadTimestamp > maxTimeout
      if (isTimeout) {
        this.prop.onTimeout()
        return
      }

      // need emit heartbeat
      if (
        now - this.lastWriteTimestamp > HEART_BEAT ||
        now - this.lastReadTimestamp > HEART_BEAT
      ) {
        this.emit()
      }
    }, HEART_BEAT)
  }

  /**
   * destroy
   */
  private destroy = () => {
    clearTimeout(this.heartBeatTimer)

    this.lastReadTimestamp = -1
    this.lastWriteTimestamp = -1
  }
}

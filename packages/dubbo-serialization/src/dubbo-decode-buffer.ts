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

import { Socket } from 'node:net'
import debug from 'debug'
import { d$ } from 'apache-dubbo-common'
import ByteBuffer from './byte-buffer'
import { TDecodeBuffSubscriber } from './types'

/**
 * 在并发的tcp数据传输中，会出现少包，粘包的现象
 * 好在tcp的传输是可以保证顺序的
 * 我们需要抽取一个buffer来统一处理这些数据
 */
export default class DecodeBuffer {
  private readonly remoteAddr: string
  private readonly label: string

  private transport: Socket
  private buff: ByteBuffer
  private subscriber: Function

  private log: debug.IDebugger

  static from(transport: Socket, label: string) {
    return new DecodeBuffer(transport, label)
  }

  constructor(transport: Socket, label: string) {
    this.label = label
    this.log = debug(`${this.label}:decode-buffer`)

    this.log('%s new DecodeBuffer', this.label)

    this.transport = transport
    const { remoteAddress, remotePort } = this.transport
    this.remoteAddr = remoteAddress + ':' + remotePort
    this.log('receive remote# %s data', this.remoteAddr)

    this.buff = new ByteBuffer()

    process.nextTick(() => {
      this.transport
        .on('data', (data: Buffer) => this.receive(data))
        .on('close', () => {
          this.log('transport % closed', this.label)
          this.destroy()
        })
    })
  }

  receive(data: Buffer) {
    this.log('receive data length %d ', data.length, data)
    // concat data into buffer
    // this.buff.concat(data).resetCursor(0)
    this.buff
      .writeBytes(data, {
        index: this.buff.getLength() > 0 ? this.buff.getLength() - 1 : 0
      })
      .resetCursor(0)
    this.log(
      `write buffer %d %d ->`,
      this.buff.getCursor(),
      this.buff.getLength(),
      this.buff.buffer()
    )

    while (this.buff.getLength() >= d$.DUBBO_HEADER_LENGTH) {
      //判断buffer[0], buffer[1] 是不是dubbo的magic-high , magic-low
      const magicCodeIndex = this.buff.indexOf(
        Buffer.from([d$.DUBBO_MAGIC_HIGH, d$.DUBBO_MAGIC_LOW])
      )
      this.log('magic code index %d', magicCodeIndex)

      // check magic code
      if (magicCodeIndex === -1) {
        return
      }

      // resolve wrong magic position
      if (magicCodeIndex != 0) {
        this.buff.splice(0, magicCodeIndex)
        if (this.buff.getLength() < d$.DUBBO_HEADER_LENGTH) {
          return
        }
      }

      // read body length
      const bodyLength = this.buff.readInt({
        unsigned: true,
        index: 12
      })
      this.log('%s body length %d', this.label, bodyLength)
      const packetLength = d$.DUBBO_HEADER_LENGTH + bodyLength

      // no full packet, waiting...
      if (packetLength > this.buff.getLength()) {
        //waiting
        this.log('%s header length + body length > buffer length', this.label)
        return
      }

      // splice buff
      const buff = this.buff.splice(0, packetLength)
      this.log(
        `after splice-> cursor %d`,
        this.buff.getCursor(),
        this.buff.buffer()
      )
      this.subscriber(buff)
    }
  }

  private destroy() {
    this.buff = null
    this.transport = null
  }

  subscribe(subscriber: TDecodeBuffSubscriber) {
    this.subscriber = subscriber
    return this
  }
}

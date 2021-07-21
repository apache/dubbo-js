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
import { byte, util } from 'apache-dubbo-common'
import { IObservable, TDecodeBuffSubscriber } from './types'
import {
  DUBBO_HEADER_LENGTH,
  DUBBO_MAGIC_HIGH,
  DUBBO_MAGIC_LOW
} from './constants'
import { Socket } from 'net'

const log = debug('dubbo:decode-buffer')

/**
 * 在并发的tcp数据传输中，会出现少包，粘包的现象
 * 好在tcp的传输是可以保证顺序的
 * 我们需要抽取一个buffer来统一处理这些数据
 */
export default class DecodeBuffer
  implements IObservable<TDecodeBuffSubscriber> {
  private buffer: Buffer
  private transport: Socket
  private subscriber: Function

  constructor(transport: Socket, private flag: string) {
    log('%s new DecodeBuffer', this.flag)
    this.subscriber = util.noop
    this.buffer = Buffer.alloc(0)
    this.transport = transport

    process.nextTick(() => {
      this.transport
        .on('data', (data: Buffer) => this.receive(data))
        .on('close', () => {
          this.clearBuffer()
        })
    })
  }

  static from(transport: Socket, flag: string) {
    return new DecodeBuffer(transport, flag)
  }

  receive(data: Buffer) {
    //concat bytes
    this.buffer = Buffer.concat([this.buffer, data])
    let bufferLength = this.buffer.length

    while (bufferLength >= DUBBO_HEADER_LENGTH) {
      //判断buffer 0, 1 是不是dubbo的magic high , magic low
      const magicHigh = this.buffer[0]
      const magicLow = this.buffer[1]

      //如果不是magic high magic low 做个容错
      if (magicHigh != DUBBO_MAGIC_HIGH || magicLow != DUBBO_MAGIC_LOW) {
        log(
          `%s receive server data error, buffer[0] is 0xda ${
            magicHigh == 0xda
          } buffer[1] is 0xbb ${magicLow == 0xbb}`,
          this.flag
        )

        const magicHighIndex = this.buffer.indexOf(DUBBO_MAGIC_HIGH)
        const magicLowIndex = this.buffer.indexOf(DUBBO_MAGIC_LOW)
        log(`%s magicHigh index#${magicHighIndex}`, this.flag)
        log(`%s magicLow index#${magicLowIndex}`, this.flag)

        if (magicHighIndex === -1) {
          // 没有找到magicHigh,则将整个buffer清空
          this.buffer = this.buffer.slice(bufferLength)
        } else if (magicLowIndex === -1) {
          if (magicHighIndex === bufferLength - 1) {
            // 如果magicHigh是buffer最后一位，则整个buffer只保留最后一位
            this.buffer = this.buffer.slice(magicHighIndex)
          } else {
            // 如果magicHigh不是buffer最后一位，而且整个buffer里没有magicLow,则清空buffer
            this.buffer = this.buffer.slice(bufferLength)
          }
        } else {
          if (magicLowIndex - magicHighIndex === 1) {
            // magicHigh和magicLow在buffer中间相邻位置，则buffer移动到magicHigh的位置
            this.buffer = this.buffer.slice(magicHighIndex)
          } else {
            // magicHigh和magicLow不相邻，则buffer移动到magicHigh的下一个位置
            this.buffer = this.buffer.slice(magicHighIndex + 1)
          }
        }
        bufferLength = this.buffer.length
        if (bufferLength < DUBBO_HEADER_LENGTH) {
          return
        }
      } else {
        //数据量还不够头部的长度
        if (bufferLength < DUBBO_HEADER_LENGTH) {
          //waiting
          log('%s bufferLength < header length', this.flag)
          return
        }

        //取出头部字节
        const header = this.buffer.slice(0, DUBBO_HEADER_LENGTH)
        //计算body的长度字节位置[12-15]
        const bodyLengthBuff = Buffer.from([
          header[12],
          header[13],
          header[14],
          header[15]
        ])
        const bodyLength = byte.fromBytes4(bodyLengthBuff)
        log('%s body length %d', this.flag, bodyLength)

        if (DUBBO_HEADER_LENGTH + bodyLength > bufferLength) {
          //waiting
          log('%s header length + body length > buffer length', this.flag)
          return
        }
        const dataBuffer = this.buffer.slice(
          0,
          DUBBO_HEADER_LENGTH + bodyLength
        )
        this.buffer = this.buffer.slice(DUBBO_HEADER_LENGTH + bodyLength)
        bufferLength = this.buffer.length
        this.subscriber(dataBuffer)
      }
    }
  }

  clearBuffer() {
    //reduce memory alloc
    if (this.buffer.length > 0) {
      this.buffer = Buffer.alloc(0)
    }
  }

  subscribe(subscriber: TDecodeBuffSubscriber) {
    this.subscriber = subscriber
    return this
  }
}

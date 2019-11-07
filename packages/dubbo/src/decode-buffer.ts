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
import {fromBytes4} from './byte';
import HeartBeat from './heartbeat';
import {IObservable, TDecodeBuffSubscriber} from './types';
import {noop} from './util';

const MAGIC_HIGH = 0xda;
const MAGIC_LOW = 0xbb;
const HEADER_LENGTH = 16;
const log = debug('dubbo:decode-buffer');
export const enum DataType {
  Noop,
  HeardBeat,
  Data,
}

/**
 * 在并发的tcp数据传输中，会出现少包，粘包的现象
 * 好在tcp的传输是可以保证顺序的
 * 我们需要抽取一个buff来统一处理这些数据
 */
export default class DecodeBuffer
  implements IObservable<TDecodeBuffSubscriber> {
  /**
   * 初始化一个DecodeBuffer
   * @param pid socket-worker的pid
   */
  private constructor(pid: number) {
    log('new DecodeBuffer');
    this._pid = pid;
    this._buffer = Buffer.alloc(0);
    this._subscriber = noop;
  }

  private readonly _pid: number;
  private _buffer: Buffer;
  private _subscriber: Function;

  static from(pid: number) {
    return new DecodeBuffer(pid);
  }

  receive(data: Buffer): DataType {
    //concat bytes
    this._buffer = Buffer.concat([this._buffer, data]);
    let bufferLength = this._buffer.length;

    while (bufferLength >= HEADER_LENGTH) {
      //判断buffer 0, 1 是不是dubbo的magic high , magic low
      const magicHigh = this._buffer[0];
      const magicLow = this._buffer[1];

      //如果不是magichight magiclow 做个容错
      if (magicHigh != MAGIC_HIGH || magicLow != MAGIC_LOW) {
        log(this._buffer);

        log(
          `receive server data error, buffer[0] is 0xda ${magicHigh ==
            0xda} buffer[1] is 0xbb ${magicLow == 0xbb}`,
        );

        const magicHighIndex = this._buffer.indexOf(MAGIC_HIGH);
        const magicLowIndex = this._buffer.indexOf(MAGIC_LOW);
        log(`magicHigh index#${magicHighIndex}`);
        log(`magicLow index#${magicLowIndex}`);

        if (magicHighIndex === -1) {
          // 没有找到magicHigh,则将整个buffer清空
          this._buffer = this._buffer.slice(bufferLength);
        } else if (magicLowIndex === -1) {
          if (magicHighIndex === bufferLength - 1) {
            // 如果magicHigh是buffer最后一位，则整个buffer只保留最后一位
            this._buffer = this._buffer.slice(magicHighIndex);
          } else {
            // 如果magicHigh不是buffer最后一位，而且整个buffer里没有magicLow,则清空buffer
            this._buffer = this._buffer.slice(bufferLength);
          }
        } else {
          if (magicLowIndex - magicHighIndex === 1) {
            // magicHigh和magicLow在buffer中间相邻位置，则buffer移动到magicHigh的位置
            this._buffer = this._buffer.slice(magicHighIndex);
          } else {
            // magicHigh和magicLow不相邻，则buffer移动到magicHigh的下一个位置
            this._buffer = this._buffer.slice(magicHighIndex + 1);
          }
        }
        bufferLength = this._buffer.length;
        if (bufferLength < HEADER_LENGTH) {
          return DataType.Noop;
        }
        continue;
      }

      if (magicHigh === MAGIC_HIGH && magicLow === MAGIC_LOW) {
        //数据量还不够头部的长度
        if (bufferLength < HEADER_LENGTH) {
          //waiting
          log('bufferLength < header length');
          return DataType.Noop;
        }

        //取出头部字节
        const header = this._buffer.slice(0, HEADER_LENGTH);
        //计算body的长度字节位置[12-15]
        const bodyLengthBuff = Buffer.from([
          header[12],
          header[13],
          header[14],
          header[15],
        ]);
        const bodyLength = fromBytes4(bodyLengthBuff);
        log('body length', bodyLength);

        //判断是不是心跳
        if (HeartBeat.isHeartBeat(header)) {
          log(`SocketWorker#${this._pid} <=receive= heartbeat data.`);
          this._buffer = this._buffer.slice(HEADER_LENGTH + bodyLength);
          bufferLength = this._buffer.length;
          return DataType.HeardBeat;
        }

        if (HEADER_LENGTH + bodyLength > bufferLength) {
          //waiting
          log('header length + body length > buffer length');
          return DataType.Noop;
        }
        const dataBuffer = this._buffer.slice(0, HEADER_LENGTH + bodyLength);
        this._buffer = this._buffer.slice(HEADER_LENGTH + bodyLength);
        bufferLength = this._buffer.length;
        this._subscriber(dataBuffer);
      }
    }
    return DataType.Data;
  }

  clearBuffer() {
    //reduce memory alloc
    if (this._buffer.length > 0) {
      this._buffer = Buffer.alloc(0);
    }
  }

  subscribe(subscriber: TDecodeBuffSubscriber) {
    this._subscriber = subscriber;
    return this;
  }
}

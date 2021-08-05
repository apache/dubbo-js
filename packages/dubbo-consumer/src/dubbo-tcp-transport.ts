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

import net from 'net'
import debug from 'debug'
import { util, Retry } from 'apache-dubbo-common'
import {
  DecodeBuffer,
  decodeDubboResponse,
  DubboRequestEncoder,
  HeartBeat
} from 'apache-dubbo-serialization'
import Context from './context'
import { STATUS } from './dubbo-status'
import { IDubboObservable, IDubboTransportSubscriber } from './types'

const log = debug('dubbo:tcp-transport ~')

/**
 * 具体处理tcp底层通信的模块
 * 1 负责socket的创建和通信
 * 2.负责dubbo的序列化和反序列化
 * 3.socket断开自动重试
 */
export default class DubboTcpTransport
  implements IDubboObservable<IDubboTransportSubscriber>
{
  public readonly host: string
  private _status: STATUS
  private forceClose: boolean
  private retry: Retry
  private heartBeat: HeartBeat
  private transport: net.Socket
  private subscriber: IDubboTransportSubscriber

  private constructor(host: string) {
    log('init tcp-transport with %s:%s status: %s', host, this._status)
    this.host = host
    this.forceClose = false
    this._status = STATUS.PADDING

    //init subscriber
    this.subscriber = {
      onConnect: util.noop,
      onData: util.noop,
      onClose: util.noop
    }

    this.retry = new Retry({
      maxRetry: 120,
      delay: 500,
      retry: () => {
        this._status = STATUS.RETRY
        this.init()
      },
      end: () => {
        this.subscriber.onClose(this.host)
      }
    })

    //init socket
    this.init()
  }

  //==========================private method================================
  private init() {
    log(`tcp-transport =connecting=> ${this.host}`)
    const [host, port] = this.host.split(':')

    this.transport = new net.Socket()
    this.transport.setNoDelay()
    this.transport
      .connect(Number(port), host, this.onConnected)
      .on('error', this.onError)
      .on('close', this.onClose)

    DecodeBuffer.from(this.transport, `tcp-transport#${this.host}`).subscribe(
      (data) => {
        if (HeartBeat.isHeartBeat(data)) {
          log('tcp-transport#%s <=receive= heartbeat data.', this.host)
        } else {
          const res = decodeDubboResponse(data)
          log('tcp-transport#%s <=received=> dubbo result %O', this.host, res)
          this.subscriber.onData(res)
        }
      }
    )
  }

  private onConnected = () => {
    log('tcp-transport#%s was connected', this.host)
    this.retry.reset()
    this._status = STATUS.CONNECTED
    this.heartBeat = HeartBeat.from({
      type: 'request',
      transport: this.transport,
      onTimeout: () => this.transport.destroy()
    })
    //notify subscriber, the transport was connected successfully
    this.subscriber.onConnect({
      host: this.host,
      transport: this
    })
  }

  private onError = (err: Error) => {
    log('tcp-transport#%s <=occur error=> %s', this.host, err)
  }

  private onClose = () => {
    log('tcp-transport#%s was closed', this.host)
    this._status = STATUS.CLOSED
    if (!this.forceClose) {
      this.retry.start()
    }
  }

  //==================================public method==========================

  static from(host: string) {
    return new DubboTcpTransport(host)
  }

  /**
   * send data to dubbo service
   * @param ctx dubbo context
   */
  write(ctx: Context) {
    log('tcp-transport#%s invoke request #%d', this.host, ctx.requestId)
    // update heartbeat lastWriteTimestamp
    this.heartBeat.setWriteTimestamp()
    // send dubbo serialization request data
    this.transport.write(new DubboRequestEncoder(ctx).encode())
  }

  get status() {
    return this._status
  }

  /**
   * current status is whether available or not
   */
  get isAvailable() {
    return this._status === STATUS.CONNECTED
  }

  /**
   * current status whether retry or not
   */
  get isRetry() {
    return this._status === STATUS.RETRY
  }

  /**
   * reset and retry at once
   */
  resetThenRetry() {
    this.retry.reset()
    this.retry.start()
  }

  /**
   * subscribe the socket worker events
   * @param subscriber
   */
  subscribe(subscriber: IDubboTransportSubscriber) {
    this.subscriber = subscriber
    return this
  }

  /**
   * force close tcp transport
   */
  close() {
    this.forceClose = true
    this.transport.destroy()
  }
}

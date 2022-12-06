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

import { debug } from 'debug'
import http2 from 'node:http2'
import { IDubboClientTransport, DubboContext } from './transport'

// init log
const log = debug('dubbo3:transport:client')

export class DubboClientTransport implements IDubboClientTransport {
  // transport 实例
  private transport: any
  private ctx: DubboContext

  constructor(opts: DubboContext) {
    this.ctx = opts
    this.connect()
  }

  get url() {
    return this.ctx.url
  }

  /**
   * 建立连接
   */
  connect() {
    this.transport = http2.connect(this.url)

    this.transport.once('connect', () => {
      log('has connected')
    })
  }

  /**
   * 发送消息
   * @param msg
   */
  async send(msg: DubboContext): Promise<void> {
    this.transport.request(msg)
  }
}

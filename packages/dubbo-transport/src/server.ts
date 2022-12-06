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
import EventEmitter from 'node:events'
import http2 from 'node:http2'
import { IDubboServerTransport, DubboContext } from './transport'

// init log
const log = debug('dubbo3:transport:client')

export class DubboServerTransport
  extends EventEmitter
  implements IDubboServerTransport
{
  private ctx: DubboContext
  transport: any

  constructor(opts: DubboContext) {
    super()
    this.ctx = opts
    this.transport = this.start()
  }

  get url() {
    return this.ctx.url
  }

  get port() {
    return this.ctx.port
  }

  /**
   * 启动服务端 transport
   * @returns
   */
  start() {
    const server = http2.createServer()
    server.on('stream', (stream, headers) => {
      log(stream)
      stream.on('data', (data) => {
        log(data)
        // TODO:
      })
      stream.on('end', () => {
        log('end...')
        // TODO: 通知 client
      })
      stream.on('error', (error) => {
        log(error)
      })
    })
    server.listen(this.port)
    return server
  }
}

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
import Context from './dubbo-context'
import { IDubboResponse, TRequestId } from './types'

const log = debug('dubbo-client:queue')

/**
 * The asynchronous nature of Node requires us to think differently when approaching problems.
 * Features such as Zookeeper connections and socket creations are all asynchronous in nature.
 * However, when incoming requests arrive, the program may not have completed initialization yet.
 * If we try to block the program, it can lead to painful programming architecture.
 * Therefore, a simple solution is to push the incoming request parameters into a queue and wait for
 * the necessary resources to finish initializing before processing them. If the timeout exceeds,
 * the program will automatically handle the timeout.
 */

export default class Queue {
  private readonly queue: Map<TRequestId, Context>

  constructor() {
    log('new Queue')
    this.queue = new Map()
  }

  /**
   * init queue
   */
  static init() {
    return new Queue()
  }

  /**
   * clear queue by request id
   * @param requestId request id
   */
  private clear(requestId: TRequestId) {
    log(`clear queue #${requestId}`)
    this.queue.delete(requestId)
  }

  /**
   * push invoke context to queue
   * @param ctx context
   */
  push = (ctx: Context) => {
    //add queue
    const { requestId, dubboInterface } = ctx.request
    log(`add queue,requestId#${requestId}, interface: ${dubboInterface}`)
    this.queue.set(requestId, ctx)

    // set max timeout
    ctx.setMaxTimeout(() => {
      // delete this context
      this.queue.delete(ctx.requestId)
    })
  }

  /**
   * get request queue
   */
  get requestQueue() {
    return this.queue
  }

  /**
   * consume queue task
   * @param msg invoke result
   * @returns
   */
  consume(msg: IDubboResponse) {
    log('consume -> %j', msg)

    const { requestId, res, err, attachments } = msg
    const ctx = this.queue.get(requestId)
    if (!ctx) {
      return
    }

    // clear timeout
    ctx.cleanTimeout()
    //add attachments since dubbo2.6.3
    ctx.providerAttachments = attachments

    log(
      'handle consumer requestId:%d traceId: %s, res: %O, err: %s',
      requestId,
      ctx.traceId,
      res,
      err
    )

    // handle error
    if (err) {
      // Remove this property, otherwise it will cause JSON.stringify to fail.
      if (err['cause']) {
        delete err['cause']['cause']
      }

      ctx.reject(err)
      this.clear(requestId)
      return
    }

    // handle success
    ctx.resolve(res)
    // clean
    this.clear(requestId)
  }
}

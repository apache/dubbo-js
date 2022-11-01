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
import { IRegistry } from 'apache-dubbo-registry'
import DubboTransportManager from './dubbo-transport/dubbo-transport-manager'
import Queue from './dubbo-queue'
import Context from './dubbo-context'
import DubboTcpTransport from './dubbo-transport/dubbo-tcp-transport'
import {
  DubboMethodParamNotHessianError,
  DubboScheduleError
} from './dubbo-err'
import { IDubboResponse, TDubboInterface, TDubboUrl } from './types'

const log = debug('dubbo-client:scheduler')
const enum STATUS {
  PADDING = 'padding',
  READY = 'ready',
  FAILED = 'failed'
}

/**
 * scheduler
 * 1. subscribe registry
 * 2. subscribe dubbo-cluster
 * 3. resolve queue
 */
export default class Scheduler {
  private status: STATUS
  private readonly queue: Queue
  private readonly transportManager: DubboTransportManager

  /**
   * static factory method
   * @param registry
   * @returns
   */
  static from(registry: IRegistry<any>) {
    return new Scheduler(registry)
  }

  /**
   * constructor
   * @param registry
   */
  constructor(registry: IRegistry<any>) {
    log(`new scheduler`)
    // init status
    this.status = STATUS.PADDING
    // init queue
    this.queue = new Queue()

    // init registry and subscribe onData & onError
    registry.subscribe({
      onData: this.handleRegistryChange,
      onError: this.handleRegistryError
    })

    // init dubbo cluster
    this.transportManager = new DubboTransportManager()
      .on('connect', this.handleTransportConnect)
      .on('data', this.handleTransportData)
      .on('close', this.handleTransportClose)
  }

  /**
   * handle dubbo invoke
   * @param ctx
   */
  handleDubboInvoke = (ctx: Context) => {
    return new Promise((resolve, reject) => {
      //init promise resolve and reject
      ctx.resolve = resolve
      ctx.reject = reject

      log(`handle requestId %d, current status: %s`, ctx.requestId, this.status)

      // check hessian param
      if (!ctx.isRequestMethodArgsHessianType) {
        ctx.reject(
          new DubboMethodParamNotHessianError(
            `${ctx.dubboInterface}#${ctx.request.methodName} not all arguments are valid hessian type`
          )
        )
        return
      }

      // invoke by status
      switch (this.status) {
        case STATUS.READY:
          // add queue
          this.queue.push(ctx)
          // invoke
          this.invoke(ctx)
          break
        case STATUS.PADDING:
          log('current scheduler was padding, save ctx to queue')
          // save queue and waiting
          this.queue.push(ctx)
          break
        case STATUS.FAILED:
          this.queue.consume({
            requestId: ctx.requestId,
            err: new DubboScheduleError('registry occur fatal error')
          })
          break
        default:
          log('scheduler unknown status')
      }
    })
  }

  /**
   * destroy each transport and clean refreshTimer
   */
  destroy() {
    this.transportManager.close()
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~  handle transport mangager event ~~~~~~~~~~~~~~~
  /**
   * handle transport connect
   * @param param0
   */
  private handleTransportConnect = ({
    transport
  }: {
    transport: DubboTcpTransport
  }) => {
    const host = transport.host
    this.status = STATUS.READY
    const hostname = host.split(':')[0]
    log('scheduler receive dubbo-tcp-transport connect %s', host)

    for (let ctx of this.queue.requestQueue.values()) {
      if (
        !ctx.wasInvoked &&
        this.transportManager.couldInvokeService(ctx, hostname)
      ) {
        this.invoke(ctx)
      }
    }
  }

  /**
   * handle transport receive data
   * @param data
   */
  private handleTransportData = (data: IDubboResponse) => {
    log('handle transport data-> %j', data)
    this.queue.consume(data)
  }

  /**
   * handle transport close
   * @param host
   */
  private handleTransportClose = (host: string) => {
    log(`dubbo-tcp-transport was close %s`, host)
    // search context by host in queue, re-dispatch
    const { requestQueue } = this.queue
    for (let ctx of requestQueue.values()) {
      if (ctx.invokedByHost === host) {
        // retry invoke
        this.invoke(ctx)
      }
    }
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~ handle registry subscribe event ~~~~~~~~~~~~~~~~~~~~~~~~

  /**
   * handle registy change
   * @param map
   * @returns
   */
  private handleRegistryChange = (
    map: Map<TDubboInterface, Array<TDubboUrl>>
  ) => {
    log(`get all service info:=> %O`, map)
    this.transportManager.updateDubboServiceTransport(map)
  }

  /**
   * handle registry error
   * @param err
   */
  private handleRegistryError = (err: Error) => {
    log(`receive registry error %s`, err)
    if (this.status !== STATUS.READY) {
      this.status = STATUS.FAILED
    }
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  private invoke(ctx: Context) {
    try {
      this.transportManager.sendRequest(ctx)
    } catch (err) {
      this.queue.consume({
        requestId: ctx.requestId,
        err: new DubboScheduleError(err.message)
      })
    }
  }
}

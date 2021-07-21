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
import { go } from 'apache-dubbo-common'
import Context from './context'
import { STATUS } from './dubbo-status'
import DubboTcpTransport from './dubbo-tcp-transport'
import { IDirectlyDubboProps, IHessianType, IInvokeParam } from './types'

const log = debug('dubbo-consumer:directly-dubbo ~')

/**
 * Directly connect to the dubbo service
 * skip the connection to zookeeper
 * usually used to test the service connectivity in development
 */

export default class DubboDirectlyInvoker {
  private status: STATUS
  private readonly props: IDirectlyDubboProps
  private readonly transport: DubboTcpTransport
  private readonly queue: Map<number, Context>

  constructor(props: IDirectlyDubboProps) {
    log('bootstrap....%O', this.props)
    this.props = props
    this.queue = new Map()

    this.status = STATUS.PADDING
    this.transport = DubboTcpTransport.from(this.props.dubboHost).subscribe({
      onConnect: this.handleTransportConnect,
      onData: this.handleTransportData,
      onClose: this.handleTransportClose
    })
  }

  static from(props: IDirectlyDubboProps) {
    return new DubboDirectlyInvoker(props)
  }

  close() {
    this.transport.close()
  }

  proxyService<T extends Object>(invokeParam: IInvokeParam): T {
    const {
      dubboInterface,
      path,
      methods,
      timeout,
      group = '',
      version = '0.0.0',
      attachments = {},
      isSupportedDubbox = false
    } = invokeParam
    const proxy = Object.create(null)

    for (let methodName of Object.keys(methods)) {
      proxy[methodName] = (...args: Array<IHessianType>) => {
        return go(
          new Promise((resolve, reject) => {
            const ctx = Context.init()
            ctx.resolve = resolve
            ctx.reject = reject

            ctx.methodName = methodName
            const method = methods[methodName]
            ctx.methodArgs = method.call(invokeParam, ...args) || []

            ctx.dubboVersion = this.props.dubboVersion
            ctx.dubboInterface = dubboInterface
            ctx.path = path || dubboInterface
            ctx.group = group
            ctx.timeout = timeout
            ctx.version = version
            ctx.attachments = attachments
            ctx.isSupportedDubbox = isSupportedDubbox

            //check param
            //param should be hessian data type
            if (!ctx.isRequestMethodArgsHessianType) {
              log(
                `${dubboInterface} method: ${methodName} not all arguments are valid hessian type`
              )
              log(`arguments->%O`, ctx.request.methodArgs)
              reject(new Error('not all arguments are valid hessian type'))
              return
            }

            //超时检测
            ctx.timeout = this.props.dubboInvokeTimeout

            ctx.setMaxTimeout(() => {
              this.queue.delete(ctx.requestId)
            })

            //add task to queue
            this.addQueue(ctx)
          })
        )
      }
    }

    return proxy
  }

  // ~~~~~~~~~~~~~~~~private~~~~~~~~~~~~~~~~~~~~~~~~

  /**
   * Successfully process the task of the queue
   *
   * @param requestId
   * @param err
   * @param res
   */
  private consume({
    requestId,
    err,
    res
  }: {
    requestId: number
    err?: Error
    res?: any
  }) {
    const ctx = this.queue.get(requestId)
    if (!ctx) {
      return
    }

    if (err) {
      ctx.reject(err)
    } else {
      ctx.resolve(res)
    }

    ctx.cleanTimeout()
    this.queue.delete(requestId)
  }

  /**
   * add task's context to queue
   *
   * @param ctx
   */
  private addQueue(ctx: Context) {
    const { requestId } = ctx
    this.queue.set(requestId, ctx)

    log(`current dubbo transport => ${this.status}`)

    //根据当前socket的worker的状态，来对任务进行处理
    switch (this.status) {
      case STATUS.PADDING:
        break
      case STATUS.CONNECTED:
        this.transport.write(ctx)
        break
      case STATUS.CLOSED:
        this.consume({
          requestId,
          err: new Error(`dubbo transport was closed.`)
        })
        break
    }
  }

  //===================socket event===================
  private handleTransportConnect = () => {
    this.status = STATUS.CONNECTED
    for (let ctx of this.queue.values()) {
      //如果还没有被处理
      if (!ctx.wasInvoked) {
        ctx.invokedByHost = this.props.dubboHost
        this.transport.write(ctx)
      }
    }
  }

  private handleTransportData = ({ requestId, res, err }) => {
    log(`receive transport data %d - res: %O - err: %s`, requestId, res, err)
    this.consume({
      requestId,
      err,
      res
    })
  }

  private handleTransportClose = () => {
    log('socket-worker was closed')
    this.status = STATUS.CLOSED
    //failed all
    for (let ctx of this.queue.values()) {
      ctx.reject(new Error('socket-worker was closed.'))
      ctx.cleanTimeout()
    }
    this.queue.clear()
  }
}

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
import Context from './dubbo-context'
import { STATUS } from './dubbo-status'
import DubboTcpTransport from './dubbo-transport/dubbo-tcp-transport'
import {
  IDirectlyDubboProps,
  IDubboResponse,
  IHessianType,
  IInvokeParam,
  TRequestId
} from './types'

const log = debug('dubbo-directly-invoker')

/**
 * Directly connect to the dubbo service
 * skip the connection to zookeeper
 * usually used to test the service connectivity in development
 */

export default class DubboDirectlyInvoker {
  private status: STATUS
  private readonly props: IDirectlyDubboProps
  private transport: DubboTcpTransport
  private queue: Map<TRequestId, Context>

  /**
   * static factory method
   * @param props
   * @returns
   */
  static from(props: IDirectlyDubboProps) {
    return new DubboDirectlyInvoker(props)
  }

  /**
   * constructor
   */
  constructor(props: IDirectlyDubboProps) {
    log('bootstrap....%O', this.props)
    this.props = props
    this.queue = new Map()

    this.status = STATUS.PADDING
    this.transport = DubboTcpTransport.from(this.props.dubboHost)
      .on('connect', this.handleTransportConnect)
      .on('data', this.handleTransportData)
      .on('close', this.handleTransportClose)
  }

  /**
   * close transport
   */
  close() {
    this.transport.close()

    // free
    for (let ctx of this.queue.values()) {
      ctx.cleanTimeout()
    }
    this.queue.clear()
    this.queue = null
    this.transport = null
  }

  /**
   * stub proxy service
   * @param invokeParam
   * @returns
   */
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
            const ctx = new Context()
            ctx.resolve = resolve
            ctx.reject = reject

            // set method name
            ctx.methodName = methodName
            // set method args
            const method = methods[methodName]
            ctx.methodArgs = method.call(invokeParam, ...args) || []

            // set invoke params
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
              log(
                `invoke service %d method %s timeout`,
                ctx.dubboInterface,
                ctx.methodName
              )
              console.log(this.queue)
              this.queue.delete(ctx.requestId)
            })

            //add task to queue
            this.handleInvoke(ctx)
          })
        )
      }
    }

    return proxy
  }

  // ~~~~~~~~~~~~~~~~private~~~~~~~~~~~~~~~~~~~~~~~~

  /**
   * consum queue task
   */
  private consume({ requestId, err, res }: IDubboResponse) {
    const ctx = this.queue.get(requestId)
    if (!ctx) {
      log(`could not find context by requestId#%d`, requestId)
      return
    }

    if (err) {
      ctx.reject(err)
    } else {
      ctx.resolve(res)
    }

    // clear timeout
    ctx.cleanTimeout()
    // clear task
    this.queue.delete(requestId)
  }

  /**
   * add task's context to queue
   *
   * @param ctx
   */
  private handleInvoke(ctx: Context) {
    const { requestId } = ctx

    this.queue.set(requestId, ctx)

    log(`current dubbo transport => ${this.status}`)

    //根据当前socket的worker的状态，来对任务进行处理
    switch (this.status) {
      case STATUS.PADDING:
        log(`current status was padding, waiting...`)
        break
      case STATUS.CONNECTED:
        log(`send request`)
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

  //==================handle transport event===================
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

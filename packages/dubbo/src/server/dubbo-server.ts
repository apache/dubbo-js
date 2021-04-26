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

import net, {Socket} from 'net'
import ip from 'ip'
import debug from 'debug'
import compose from 'koa-compose'
import qs from 'querystring'
import {Retry} from './retry'
import Request from '../serialization/request'
import {decodeDubboRequest} from '../serialization/decode-hessian2'
import {DubboResponseEncoder} from '../serialization/encode-hessian2'
import HeartBeat from '../serialization/heartbeat'
import DecodeBuffer from '../serialization/decode-buffer'
import ResponseContext, {ResponseStatus} from './response-context'
import {checkRetValHessian} from '../common/util'
import {fromRegistry} from '../registry'
import {randomPort} from './port'

import {IDubboServerProps, IDubboService, Middleware} from '../types'

type DubboServiceClazzName = string

const log = debug('dubbo-server')

export default class DubboServer {
  private retry: Retry
  private port: number
  private server: net.Server
  private registry: string | Function
  private services: Array<IDubboService>
  private serviceMap: Map<DubboServiceClazzName, IDubboService>
  private readonly middlewares: Array<Middleware<ResponseContext>>

  constructor(props: IDubboServerProps) {
    const {port, services} = props
    this.port = port || 20880
    this.registry = props.registry
    this.middlewares = []
    this.services = services || []
    this.serviceMap = new Map()

    // set retry
    this.retry = new Retry({
      retry: () => this.listen(),
      end: () => {
        throw new Error(
          'Oops, dubbo server can not start, can not find available port',
        )
      },
    })

    // debug log service
    log(`init service with port: %d`, this.port)
    for (let service of this.services) {
      const methods = Object.keys(service.methods)
      const s = {...service, methods}
      log('registry services %j', s)
    }

    // listen tcp server
    this.listen()
  }

  // ~~~~~~~~~~~~~~~~~~private~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  private listen = async () => {
    this.port = await randomPort()
    this.server = net
      .createServer(this._handleSocketRequest)
      .listen(this.port, () => {
        log('start dubbo-server with port %d', this.port)
        this.retry.reset()
        this._registerServices()
      })
      .on('error', (err) => {
        log(`server listen %d port err: %s`, this.port, err)
        this.retry.start()
      })
  }

  private _handleSocketRequest = (socket: Socket) => {
    log('tcp socket establish connection')
    // init heartbeat
    const heartbeat = HeartBeat.from({
      type: 'response',
      transport: socket,
      onTimeout: () => socket.destroy(),
    })

    DecodeBuffer.from(socket, 'dubbo-server').subscribe(async (data) => {
      if (HeartBeat.isHeartBeat(data)) {
        log(`receive socket client heartbeat`)
        heartbeat.emit()
        return
      }
      const ctx = await this._invokeRequest(data)
      heartbeat.setWriteTimestamp()
      socket.write(new DubboResponseEncoder(ctx).encode())
    })
  }

  private async _invokeRequest(data: Buffer) {
    const request = decodeDubboRequest(data)
    const service = this.matchService(request)
    const context = new ResponseContext(request)

    const {
      methodName,
      attachment: {path, group, version},
    } = request

    // service not found
    if (!service) {
      context.status = ResponseStatus.SERVICE_NOT_FOUND
      context.body.err = new Error(
        `Service not found with ${path} and ${methodName}, group:${group}, version:${version}`,
      )
      return context
    }

    const middlewares = [
      ...this.middlewares,
      async function handleRequest(ctx: ResponseContext) {
        const method = service.methods[request.methodName]
        ctx.status = ResponseStatus.OK
        let err = null
        let res = null
        try {
          res = await method.apply(service, [...(request.args || []), ctx])
          // check hessian type
          if (!checkRetValHessian(res)) {
            throw new Error(
              `${path}#${methodName} return value not hessian type`,
            )
          }
        } catch (error) {
          err = error
        }
        ctx.body = {
          res,
          err,
        }
      },
    ]

    log('middleware stack =>', middlewares)
    const fn = compose(middlewares)

    try {
      await fn(context)
    } catch (err) {
      log(err)
      context.status = ResponseStatus.SERVER_ERROR
      context.body.err = err
    }
    return context
  }

  private _registerServices() {
    const services = this.services
    // init serviceMap
    for (let service of services) {
      this.serviceMap.set(service.dubboInterface, service)
    }

    const registryService = []

    for (let service of services) {
      // compose dubbo url
      // dubbo://127.0.0.1:3000/org.apache.dubbo.js.HelloWorld?group=fe&version=1.0.0&method=sayHello,sayWorld
      const url = this._urlBuilder(service)
      // write to zookeeper
      registryService.push([service.dubboInterface, url])
    }

    const registry = fromRegistry(this.registry)

    registry({
      type: 'provider',
      services: registryService,
    })
  }

  private _urlBuilder(service: IDubboService) {
    const ipAddr = ip.address()
    const {dubboInterface, group = '', version, methods} = service
    const methodName = Object.keys(methods).join()

    return encodeURIComponent(
      `dubbo://${ipAddr}:${this.port}/${dubboInterface}?` +
        qs.stringify({
          group,
          version,
          method: methodName,
          side: 'provider',
          pid: process.pid,
          generic: false,
          protocal: 'dubbo',
          dynamic: true,
          category: 'providers',
          anyhost: true,
          timestamp: Date.now(),
        }),
    )
  }

  private matchService(request: Request) {
    const {methodName} = request
    const {
      attachment: {path, group = '', version},
    } = request

    const service = this.serviceMap.get(path)
    if (
      !service ||
      service.methods[methodName] === undefined ||
      service.group !== group ||
      service.version !== version
    ) {
      return null
    }
    return service
  }

  // ~~~~~~~~~~~~~public method ~~~~~~~~~~~~~~~~~~~

  public static from(props: IDubboServerProps) {
    return new DubboServer(props)
  }

  public close() {
    this.server?.close()
  }

  /**
   * extends middleware
   * @param fn
   */
  public use(fn: Middleware<ResponseContext>) {
    if (typeof fn != 'function') {
      throw new TypeError('middleware must be a function')
    }
    log('use middleware %s', (fn as any)._name || fn.name || '-')
    this.middlewares.push(fn)
    return this
  }
}

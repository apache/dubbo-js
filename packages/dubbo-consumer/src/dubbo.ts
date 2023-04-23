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
import compose from 'koa-compose'
import { util } from 'apache-dubbo-common'
import config from './dubbo-config'
import Context from './dubbo-context'
import Scheduler from './dubbo-scheduler'
import * as s from './dubbo-setting'
import { IDubboProps, DubboService, Middleware, TDubboService } from './types'

const log = debug('dubbo-client')
log('version => %s', require('../package.json').version)

/**
 * Dubbo client = dubbo service consumer side
 * 1. Connect to the registration center zookeeper
 * 2. Initiate method call of remote dubbo service
 * 3. Serialization/deserialization of dubbo protocol
 * 4. Manage tcp connection and heartbeat
 * 5. The corresponding method of automatically proxying interface through proxy mechanism
 * 6. Provide quick test interface in direct connection mode
 * 7. Middleware
 * 8. Full link tracking of dubbo calls can be realized through zone-context
 * 9. Centralized message management
 */
export default class Dubbo<T = object> {
  private readonly props: IDubboProps
  private readonly scheduler: Scheduler
  private readonly middlewares: Array<Middleware<Context>> = []
  // collection dubbo service meta data
  private readonly dubboServices: Array<DubboService> = []
  // invoke rpc method from service
  public readonly service: TDubboService<T> = {} as TDubboService<T>

  private dubboSetting: s.DubboSetting

  constructor(props: IDubboProps) {
    // init props
    this.props = props
    // check dubbo register
    this.checkProps()
    //Initialize config
    this.initConfig()
    // init service
    this.aggregationStubServices(this.props.services)
    //create scheduler
    this.scheduler = Scheduler.from(this.props.registry)
    // register consumer info
    this.props.registry
      .registerConsumers({
        application: this.props.application,
        services: this.dubboServices
      })
      .then(() => log(`registry consumer success`))
      .catch((err) => log(`registry consumer error %s`, err))
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~ public method ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  /**
   * static factory method
   * @param props
   */
  static from(props: IDubboProps) {
    return new Dubbo(props)
  }

  /**
   * proxy dubbo stub service
   * @param provider
   * @returns
   */
  proxyService<T = any>(provider: DubboService): T {
    return provider as T
  }

  /**
   * extends middleware, api: the same as koa
   * @param fn
   */
  use(fn: Middleware<Context>) {
    // chec
    if (typeof fn != 'function') {
      throw new TypeError('middleware must be a function')
    }

    log('use middleware %s', (fn as any)._name || fn.name || '-')
    this.middlewares.push(fn)
    return this
  }

  /**
   * waiting dubbo client was ready
   *
   * For example, in conjunction with egg, egg provides a beforeStart method
   * Wait for the successful initialization of dubbo through the ready method
   *
   * //app.js
   * export default (app: EggApplication) => {
   * const dubbo = Dubbo.from({....})
   * app.beforeStart(async () => {
   *  await dubbo.ready();
   *  console.log('dubbo was ready...');
   * })
   *}
   */
  ready() {
    return this.props.registry.ready()
  }

  /**
   * close dubbo consumer, usually used in test suite
   */
  close() {
    this.props.registry.close()
    this.scheduler.destroy()
  }

  // ======================== private method =======================

  /**
   * check current props
   */
  private checkProps() {
    if (!util.isObj(this.props.registry)) {
      throw new Error('please specify registry instance')
    }
    // check stub service
    if (!util.isObj(this.props.services)) {
      throw new Error(`Please specify dubbo stub services`)
    }
  }

  /**
   * init dubbo client config
   */
  private initConfig() {
    //Global timeout (maximum fusing time) similar to <dubbo:consumer timeout="sometime"/>
    //For the consumer client, if the user sets the interface level timeout time, the interface level is used
    //If the user does not set the user level, the default is the maximum timeout
    this.dubboSetting = this.props.dubboSetting || s.Setting()
    config.dubboInvokeTimeout =
      this.props.dubboMaxTimeout ||
      this.dubboSetting.maxTimeout ||
      config.dubboInvokeTimeout
    log('config: %O', config)
  }

  /**
   * aggregation stub service into one service object
   * service style:
   * {[key: string]: (dubbo): T => dubbo.proxyService<T>({...})}
   * @param services
   */
  private aggregationStubServices(services: IDubboProps['services']) {
    for (let [id, proxyService] of Object.entries(services)) {
      // call dubbo.proxyService
      const service = proxyService(this) as DubboService
      // collection proxy service return dubbo service
      this.dubboServices.push(service)

      // get service meta data, such as group,version etc
      const meta = this.dubboSetting.getDubboSetting({
        dubboServiceShortName: id,
        dubboServiceInterface: service.dubboInterface
      })

      // stub service => service
      service.group = meta.group
      service.version = meta.version
      this.service[id] = this.stubService(service)
    }
  }

  /**
   * stub service and make invoke middleware chains
   * @param service
   * @returns
   */
  private stubService = (service: DubboService) => {
    const { application, isSupportedDubbox } = this.props
    const { dubboInterface, methods, timeout, group, version } = service

    //stub service method
    return Object.keys(methods).reduce((r, name) => {
      r[name] = async (...args: any[]) => {
        log('%s#%s create context', dubboInterface, name)
        // create new context
        const ctx = new Context()

        // set application and is supoort dubbox
        ctx.application = application
        ctx.isSupportedDubbox = isSupportedDubbox
        // set dubbo version
        ctx.dubboVersion = this.props.dubboVersion

        // set dubbo interface
        ctx.dubboInterface = dubboInterface
        // set method name
        ctx.methodName = name
        // set method args
        const method = methods[name]
        ctx.methodArgs = method.call(service, ...args) || []

        // set group && version && timeout
        ctx.group = group
        ctx.version = version
        ctx.timeout = timeout

        // invoke
        return await this.invokeMiddlewareChain(ctx)
      }
      return r
    }, Object.create(null))
  }

  /**
   * invoke rpc method
   * @param ctx
   * @returns
   */
  private async invokeMiddlewareChain(ctx: Context) {
    const fn = compose([...this.middlewares, this.handleRequestMiddleware])
    try {
      await fn(ctx)
      return ctx.body
    } catch (err) {
      log(err)
      throw err
    }
  }

  /**
   * handle request middleware
   * @param ctx
   */
  private handleRequestMiddleware = async (ctx: Context) => {
    log('middleware:handle request -> %j', ctx.request)
    ctx.body = await this.scheduler.handleDubboInvoke(ctx)
    log('middleware:end request %j', ctx.body)
  }
}

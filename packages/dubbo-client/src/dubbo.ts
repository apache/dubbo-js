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
interface DubboClientProp {
  services: { [name: string]: any }
}
  import debug from 'debug'
  import Context from './context'
  import { IDubboService, TDubboService } from './types'
  import compose from 'koa-compose'
  
  const log = debug('dubbo:bootstrap')  
  export default class DubboClient<T = object> {
    // private status
    public readonly services: TDubboService<T>
    private readonly middlewares: Array<any>
    constructor(props: any) {
      // init service
      this.services = <TDubboService<T>>{}
      this.middlewares = []
      this.collectService(props.services)
    }
    // 返回元数据
    proxyService<T>(service: IDubboService): T {
      return service as T
    }
  
    // 收集servive
    private collectService(services: { [name: string]: any }) {
      // 基于配置获取元信息
      for (let [name, serviceProxy] of Object.entries(services)) {
        const service = serviceProxy(this)
        service.shortName = name
        this.services[name] = this.composeService(service)
      }
    }
    // 
    private handleInvoke = async (ctx: Context) => {
      // check beehive queue
      ctx.body = await this.queue.push(ctx)
    }

    private composeService(service: IDubboService) {
      const { path, methods } = service
      const proxyMethods: {[name:string]:any} = new Object()
      for (let [name, method] of Object.entries(methods)) {
        proxyMethods[name] =async (args: Array<any>) => {
          const ctx = new Context()
          ctx.path = path
          ctx.args = args || []
          // 合成执行方法
          const fn = compose([...this.middlewares],this.handleInvoke)
          await fn(ctx)
          return ctx.body
        }
      }
      return proxyMethods
    }
  }
  
  //
  
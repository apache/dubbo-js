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
interface IstubServices {
  [name: string]: any
}
import Context from './context'
import { IDubboMethod } from './types'
interface Iservice {
  methodName: string
  method: any
}
export default class DubboClient<T = object> {
  // private status
  public services
  // private readonly middlewares: Array<any>
  constructor(services: IstubServices) {
    // init service
    this.services = Object.create(null) as T
    // this.middlewares = []
    this.collectService(services)
  }

  // collect servive
  private collectService(services: { [name: string]: any }) {
    // get method
    const proxy = Object.create(null)
    for (let [name, service] of Object.entries(services)) {
      for (let [methodName, method] of Object.entries(service)) {
        proxy[methodName] = this.composeService(method as IDubboMethod)
      }
    }
    this.services = proxy
    return proxy
  }
  // init ctx
  private async composeService(method: IDubboMethod) {
    const ctx = new Context()
    ctx.method = method.method
    ctx.setPath(method.path)
    // ctx.resolve = function ()
    // ctx.body = await dubboTranport.send(ctx)
    return ctx.body
  }
}

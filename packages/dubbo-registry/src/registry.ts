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

import {
  RegisterConsumerService,
  IRegistrySubscriber,
  IDubboService
} from './types'

export interface IRegistry<T> {
  /**
   * waiting registry status ready
   */
  ready(): Promise<void>

  /**
   * find dubbo service urls
   * @param dubboInterfaces
   */
  findDubboServiceUrls(dubboInterfaces: Array<string>): Promise<void>

  /**
   * register dubbo service
   * @param meta
   */
  registerServices(meta: {
    application: { name: string }
    port: number
    dubbo?: string
    services: Array<IDubboService>
  }): Promise<void>

  /**
   * register dubbo consumer
   * @param consumers
   */
  registerConsumers(consumers: RegisterConsumerService): Promise<void>

  /**
   * subscribe registry service status change
   * @param cb
   */
  subscribe(cb: IRegistrySubscriber): this

  /**
   * close
   */
  close(): void

  /**
   * get registry client such as zookeeper, nacos
   */
  getClient(): T
}

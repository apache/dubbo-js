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
import BaseRegistry from './registry-base'
import { IRegistry } from './registry'
import { INaocsClientProps, TDubboInterface, TDubboUrl } from './types'
import qs from 'querystring'

// log
const dlog = debug('dubbo:nacos~')
const NacosNamingClient = require('nacos').NacosNamingClient

// nacos debug
export class NacosRegistry
  extends BaseRegistry
  implements IRegistry<typeof NacosNamingClient> {
  // nacos props
  private nacosProps: INaocsClientProps
  private client: typeof NacosNamingClient

  private readonly readyPromise: Promise<void>
  private resolve: Function
  private reject: Function

  constructor(nacosProps: INaocsClientProps) {
    super()
    dlog(`init nacos with %O`, nacosProps)
    this.nacosProps = nacosProps
    this.nacosProps.nacosRoot = this.nacosProps.nacosRoot || 'dubbo'

    // init ready promise
    this.readyPromise = new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })

    // init nacos client
    this.init()
  }

  // ~~~~~~~~~~~~~~~~ private ~~~~~~~~~~~~~~~~~~~~~~~~~~

  // nacos connect
  private async init() {
    let registryUrl = this.nacosProps.connect.split('nacos://')[1]
    dlog(`connecting nacosserver ${registryUrl}`)

    this.client = new NacosNamingClient({
      logger: console,
      serverList: registryUrl,
      namespace: 'public'
    })

    try {
      await this.client.ready()
      this.resolve()
    } catch (err) {
      this.reject(err)
    }
  }

  ready(): Promise<void> {
    return this.readyPromise
  }

  async findDubboServiceUrls(dubboInterfaces: Array<string>) {
    dlog('find dubbo service urls => %O', dubboInterfaces)
    await Promise.all(
      dubboInterfaces.map((dubboInterface) =>
        this.findDubboServiceUrl(dubboInterface)
      )
    )
    this.emitData(this.dubboServiceUrlMap)
  }

  async findDubboServiceUrl(dubboInterface: string) {
    const dubboServiceUrls = await this.client.getAllInstances(dubboInterface)
    dlog('dubboServiceUrls => %O', dubboServiceUrls)
    for (let { ip: hostname, port, metadata } of dubboServiceUrls) {
      const url = `consumer://${hostname}:${port}/${dubboInterface}?${qs.stringify(
        metadata
      )}`
      this.dubboServiceUrlMap.set(dubboInterface, [url])
    }
  }

  // 注册服务提供
  async registerServices(
    services: Array<{
      dubboServiceInterface: TDubboInterface
      dubboServiceUrl: TDubboUrl
    }>
  ) {
    dlog('services => %O', services)
    for (let { dubboServiceInterface, dubboServiceUrl } of services) {
      let metadata = qs.parse(dubboServiceUrl.split('?')[1])
      const ipAndHost = dubboServiceUrl.split('dubbo://')[1].split('/')[0]
      const ip = ipAndHost.split(':')[0]
      const port = ipAndHost.split(':')[1] || 80
      dlog('metadata and ipAndHost => ', metadata, ipAndHost)
      await this.client.registerInstance(dubboServiceInterface, {
        ip,
        port,
        metadata
      })
    }
  }

  // 注册服务消费
  async registerConsumers(
    consumers: Array<{
      dubboServiceInterface: TDubboInterface
      dubboServiceUrl: TDubboUrl
    }>
  ) {
    dlog('consumers => %O', consumers)
    const dubboInterfaces = new Set<string>()
    for (let { dubboServiceInterface, dubboServiceUrl } of consumers) {
      dubboInterfaces.add(dubboServiceInterface)
      let metadata = qs.parse(dubboServiceUrl.split('?')[1])
      const ipAndHost = dubboServiceUrl.split('consumer://')[1].split('/')[0]
      const ip = ipAndHost?.split(':')[0]
      const port = ipAndHost?.split(':')[1] || 80
      dlog('metadata and ipAndHost => ', metadata, ipAndHost)
      await this.client.registerInstance(dubboServiceInterface, {
        ip,
        port,
        metadata
      })
    }
    await this.findDubboServiceUrls([...dubboInterfaces])
  }

  close(): void {
    this.client?.close()
  }

  getClient() {
    return this.client
  }
}

export function Nacos(props: INaocsClientProps) {
  return new NacosRegistry(props)
}

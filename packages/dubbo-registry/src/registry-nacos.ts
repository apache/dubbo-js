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

const log = debug('dubbo:nacos')
const NacosNamingClient = require('nacos').NacosNamingClient

// nacos debug
export class NacosRegistry
  extends BaseRegistry
  implements IRegistry<typeof NacosNamingClient> {
  // nacos props
  private nacosProps: INaocsClientProps
  private client: typeof NacosNamingClient

  constructor(nacosProps: INaocsClientProps) {
    super()
    log(`init nacos with %O`, this.nacosProps)
    this.nacosProps = nacosProps
    this.nacosProps.nacosRoot = this.nacosProps.nacosRoot || 'dubbo'

    // init nacos client
    this.init()
  }

  // ~~~~~~~~~~~~~~~~ private ~~~~~~~~~~~~~~~~~~~~~~~~~~

  // nacos connect
  private async init() {
    let registryUrl = this.nacosProps.url.split('nacos://')[1]
    log(`connecting nacosserver ${registryUrl}`)

    this.client = new NacosNamingClient({
      logger: console,
      serverList: registryUrl,
      namespace: 'public'
    })

    this.client.ready()
  }

  // private _init = async (err: Error) => {
  //   // nacos occur error
  //   if (err) {
  //     log(err)
  //     traceErr(err)
  //     this.subscriber.onError(err)
  //     return
  //   }

  //   // if current nacos call from dubbo provider, registry provider service to nacos
  //   if (this.props.type === 'provider') {
  //     log(`this._dubboProps.type=${this.props.type}`)
  //     return
  //   }

  //   // nacos connected
  //   let {interfaces, dubboSetting} = this.props

  //   log(`this._dubboProps=${this.props}`)

  //   // 获取所有 provider
  //   for (let item of interfaces) {
  //     let obj = await dubboSetting.getDubboSetting(item)
  //     // providers:org.apache.dubbo.demo.DemoProvider:1.0.0:
  //     let inf = 'providers:' + item + ':' + obj.version + ':'
  //     const dubboServiceUrls = await this._client.getAllInstances(inf)
  //     // set dubbo interface meta info
  //     for (let {ip, port, metadata} of dubboServiceUrls) {
  //       this.dubboServiceUrlMap.set(metadata.path, {...metadata, ip, port})
  //     }
  //   }
  //   log(`this._dubboServiceUrlMap=${this.dubboServiceUrlMap}`)
  //   this.subscriber.onData(this.allAgentAddrSet)
  // }

  // ~~~~~~~~~~~~~~~~ public ~~~~~~~~~~~~~~~~~~~~~~~~~~

  ready(): Promise<void> {
    throw new Error('Method not implemented.')
  }
  findDubboServiceUrls(dubboInterfaces: string[]): Promise<void> {
    console.log(dubboInterfaces)
    throw new Error('Method not implemented.')
  }

  registyServices(
    services: Array<{
      dubboServiceInterface: TDubboInterface
      dubboServiceUrl: TDubboUrl
    }>
  ): Promise<void> {
    console.log(services)
    throw new Error('Method not implemented.')
  }
  registyConsumers(
    consumers: Array<{
      dubboServiceInterface: TDubboInterface
      dubboServiceUrl: TDubboUrl
    }>
  ): Promise<void> {
    console.log(consumers)
    throw new Error('Method not implemented.')
  }

  close() {}

  getClient() {
    return this.client
  }
}

export function Nacos(props: INaocsClientProps) {
  new NacosRegistry(props)
}

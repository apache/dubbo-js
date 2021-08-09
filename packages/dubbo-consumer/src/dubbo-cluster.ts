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
import { util } from 'apache-dubbo-common'
import DubboTcpTransport from './dubbo-tcp-transport'
import select from './select'
import {
  IDubboObservable,
  IDubboTransportSubscriber,
  HostName,
  Host
} from './types'

const log = debug('dubbo:dubbo-cluster')

/**
 * Management container for machine agent and dubbo-tcp-transport
 * Cluster can be understood as an abstraction of a dubbo service server
 */

export default class DubboCluster
  implements IDubboObservable<IDubboTransportSubscriber>
{
  private subscriber: IDubboTransportSubscriber
  private readonly dubboClusterTransportMap: Map<
    HostName,
    Set<DubboTcpTransport>
  >

  constructor() {
    log('init dubbo-cluster')
    this.dubboClusterTransportMap = new Map()
    this.subscriber = {
      onConnect: util.noop,
      onData: util.noop,
      onClose: util.noop
    }
  }

  // ~~~~~~~~~~~~~~~~~~~~private methods~~~~~~~~~~~~~~~~~~~~~~~~~

  private handleTransportClose =
    (transport: DubboTcpTransport, hostname: string) => (host: string) => {
      log('receive dubbo-tcp-transport closed %s', transport.host)
      if (!this.dubboClusterTransportMap.has(hostname)) {
        return
      }

      const transports = this.dubboClusterTransportMap.get(hostname)
      log('delete dubbo-tcp-transport %s', transport.host)
      transports.delete(transport)
      log('current dubbo-tcp-transport map %O', this.dubboClusterTransportMap)
      this.subscriber.onClose(host)
    }

  private updateDubboClusterTransports(hostname: HostName, hosts: Set<Host>) {
    const transports = this.dubboClusterTransportMap.get(hostname)
    const existHosts = [...transports].map((transport) => transport.host)
    const addHosts = [...hosts].filter((host) => !existHosts.includes(host))
    for (let host of addHosts) {
      const transport = DubboTcpTransport.from(host)
      transport.subscribe({
        onConnect: this.subscriber.onConnect,
        onData: this.subscriber.onData,
        onClose: this.handleTransportClose(transport, hostname)
      })
      transports.add(transport)
    }
  }

  private addDubboClusterTransports(hostname: HostName, hosts: Set<Host>) {
    const transports = [...hosts].map((host) => {
      const transport = DubboTcpTransport.from(host)
      transport.subscribe({
        onConnect: this.subscriber.onConnect,
        onData: this.subscriber.onData,
        onClose: this.handleTransportClose(transport, hostname)
      })
      return transport
    })
    this.dubboClusterTransportMap.set(hostname, new Set([...transports]))
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~public methods~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  setDubboClusterTransport(transports: Map<HostName, Set<Host>>) {
    log('set dubbo cluster transport %O', transports)
    for (let [hostname, hosts] of transports) {
      if (this.dubboClusterTransportMap.has(hostname)) {
        this.updateDubboClusterTransports(hostname, hosts)
      } else {
        this.addDubboClusterTransports(hostname, hosts)
      }
    }
    log('current dubbo-tcp-transport map %O', this.dubboClusterTransportMap)
  }

  isClusterReady(hostname: HostName) {
    return this.getClusterReadyDubboTransports(hostname).length > 0
  }

  getClusterReadyDubboTransports(hostname: HostName) {
    const transports = this.dubboClusterTransportMap.get(hostname)
    return [...transports].filter((transport) => transport.isAvailable)
  }

  getAllReadyClusterHosts(hostnames: Set<HostName>) {
    return [...hostnames].filter((hostname: string) =>
      this.isClusterReady(hostname)
    )
  }

  getAvailableDubboTransport(hostnames: Set<HostName>): DubboTcpTransport {
    // 1. first, We find available clusters
    const allReadyHostnames = this.getAllReadyClusterHosts(hostnames)
    log('find all available clusters %s', allReadyHostnames)

    // 2. select one cluster
    const hostname = select<string>(allReadyHostnames, 'random')
    if (!hostname) {
      return null
    }

    // 3. get all transports
    const transports = this.getClusterReadyDubboTransports(hostname)
    log(
      'find all available transports %s',
      transports.map((t) => t.host)
    )

    const transport = select<DubboTcpTransport>(transports, 'random')
    log('last choose transport %s', transport.host)
    return transport
  }

  subscribe(subscriber: IDubboTransportSubscriber) {
    this.subscriber = subscriber
    return this
  }

  refresh(serviceHostMap: Map<HostName, Set<Host>>) {
    for (let [hostname, hosts] of serviceHostMap.entries()) {
      if (this.dubboClusterTransportMap.has(hostname)) {
        const transports = this.dubboClusterTransportMap.get(hostname)
        const transportHosts = [...transports].map(
          (transport) => transport.host
        )
        const diff = [...hosts].filter((host) => !transportHosts.includes(host))
        if (diff.length > 0) {
          this.addDubboClusterTransports(hostname, new Set(diff))
        }
      } else {
        this.addDubboClusterTransports(hostname, hosts)
      }
    }
  }

  close() {
    for (let transports of this.dubboClusterTransportMap.values()) {
      transports.forEach((transport) => transport.close())
    }
  }
}

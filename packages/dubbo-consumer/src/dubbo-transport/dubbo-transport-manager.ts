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

import EventEmitter from 'node:events'
import debug from 'debug'
import { d$ } from 'apache-dubbo-common'

import DubboUrl from '../dubbo-url'
import Context from '../dubbo-context'
import select from '../dubbo-load-balance'
import DubboTcpTransport from './dubbo-tcp-transport'

import { HostName, Host, TDubboInterface, TDubboUrl } from '../types'

const log = debug('dubbo-client:transport-manager')

/**
 * Management container for machine agent and dubbo-tcp-transport
 * Cluster can be understood as an abstraction of a dubbo service server
 */

export default class DubboTransportManager extends EventEmitter {
  private readonly dubboServiceMap: Map<TDubboInterface, Array<DubboUrl>>
  private readonly dubboTransportMap: Map<HostName, Set<DubboTcpTransport>>

  constructor() {
    super()
    log('init dubbo-transport-manager')
    // init service url map
    this.dubboServiceMap = new Map()
    // init dubbo transport map
    this.dubboTransportMap = new Map()
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~public methods~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  sendRequest(ctx: Context) {
    // find transport
    const hostnames = this.findServiceTransportHostNames(ctx)
    if (hostnames.size === 0) {
      throw new Error(
        `Could not find any transport can invoke ${ctx.dubboInterface}`
      )
    }

    const transport = this.getAvailableDubboTransport(hostnames)
    if (!transport) {
      throw new Error(
        `Could not find any ready avaliable transport handle ${ctx.dubboInterface} with: group:${ctx.group} version: ${ctx.version}`
      )
    }

    ctx.invokedByHost = transport.host
    const url = this.findDubboUrlByHost(ctx.dubboInterface, transport.host)
    ctx.request.dubboVersion =
      ctx.request.dubboVersion ||
      url.dubboVersion ||
      d$.DEFAULT_DUBBO_PROTOCOL_VERSION
    ctx.request.path = url.path

    transport.write(ctx)
  }

  updateDubboServiceTransport(map: Map<TDubboInterface, Array<TDubboUrl>>) {
    const transportMap = new Map() as Map<HostName, Set<Host>>

    for (let [dubboInterface, dubboUrls] of map) {
      // if registry get dubbo url is empty, but in memory dubbo interface map dubbo url is not empty
      // don't override it.
      if (dubboUrls.length === 0 && this.dubboServiceMap.get(dubboInterface)) {
        continue
      }

      this.dubboServiceMap.set(
        dubboInterface,
        dubboUrls.map((dubboUrl) => {
          // parse url
          const url = DubboUrl.from(dubboUrl)
          const { hostname, port } = url
          const host = `${hostname}:${port}`

          // update transport map
          if (transportMap.has(hostname)) {
            transportMap.get(hostname).add(host)
          } else {
            transportMap.set(hostname, new Set([host]))
          }

          // return dubbo url
          return url
        })
      )
    }

    this.setDubboTransport(transportMap)
  }

  /**
   * judge hostname whethe invoke service
   * @param ctx
   * @param hostname
   * @returns boolean
   */
  couldInvokeService(ctx: Context, hostname: string) {
    return this.findServiceTransportHostNames(ctx).has(hostname)
  }

  close() {
    for (let transports of this.dubboTransportMap.values()) {
      transports.forEach((transport) => transport.close())
    }
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~ private methods~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  /**
   * set dubbo transport by hostname and hosts
   * @param transports
   */
  private setDubboTransport(transports: Map<HostName, Set<Host>>) {
    log('set dubbo cluster transport %O', transports)
    for (let [hostname, hosts] of transports) {
      if (this.dubboTransportMap.has(hostname)) {
        this.updateDubboTransports(hostname, hosts)
      } else {
        this.addDubboTransports(hostname, hosts)
      }
    }
    log('current dubbo-tcp-transport map %O', this.dubboTransportMap)
  }

  /**
   * add dubbo transports
   * @param hostname
   * @param hosts
   */
  private addDubboTransports(hostname: HostName, hosts: Set<Host>) {
    const transports = [...hosts].map((host) => {
      return this.buildDubboTransport(host)
    })
    this.dubboTransportMap.set(hostname, new Set([...transports]))
  }

  /**
   * update dubbo transports
   * @param hostname
   * @param hosts
   */
  private updateDubboTransports(hostname: HostName, hosts: Set<Host>) {
    const transports = this.dubboTransportMap.get(hostname)
    const curHosts = [...transports].map((transport) => transport.host)
    const newHosts = [...hosts].filter((host) => !curHosts.includes(host))

    // add new transports
    for (let host of newHosts) {
      transports.add(this.buildDubboTransport(host))
    }
  }

  /**
   * build a transport by host
   * @param host
   * @returns
   */
  private buildDubboTransport(host: Host) {
    return DubboTcpTransport.from(host)
      .on('connect', (data: { transport: DubboTcpTransport }) => {
        log(`receive transport#%s connect`, host)
        this.emit('connect', data)
      })
      .on('data', (data) => {
        log('receive transport#%s data %j', host, data)
        this.emit('data', data)
      })
      .on('close', (data: { transport: DubboTcpTransport }) => {
        log(`receive transport#%s was closed`, host)
        this.handleTransportClose(data.transport)
      })
  }

  /**
   * the transport was closed, delete from dubbo transport map
   * @param transport
   * @returns
   */
  private handleTransportClose = (transport: DubboTcpTransport) => {
    log('receive dubbo-tcp-transport closed %s', transport.host)
    const hostname = transport.host.split(':')[0]
    if (!this.dubboTransportMap.has(hostname)) {
      return
    }

    const transports = this.dubboTransportMap.get(hostname)
    log('delete dubbo-tcp-transport %s', transport.host)
    transports.delete(transport)

    // emit scheduler
    this.emit('close', transport.host)
  }

  /**
   * find dubbo service transport host names by context
   * @param ctx
   * @returns
   */
  private findServiceTransportHostNames(ctx: Context): Set<HostName> {
    const { dubboInterface, version, group } = ctx

    return this.dubboServiceMap
      .get(dubboInterface)
      .filter((url) => {
          // "*" refer to default wildcard in dubbo
          const isSameVersion = version === '*' || url.version === version
          //如果Group为null，就默认匹配， 不检查group
          //如果Group不为null，确保group和接口的group一致
          const isSameGroup = group === '*' || group === url.group
          return isSameGroup && isSameVersion
      })
      .reduce((reducer: Set<HostName>, prop: DubboUrl) => {
        reducer.add(prop.hostname)
        return reducer
      }, new Set())
  }

  private findDubboUrlByHost(dubboInterface: string, host: Host) {
    const [hostname, port] = host.split(':')
    const dubboUrls = this.dubboServiceMap.get(dubboInterface)
    return dubboUrls.find(
      (url) => url.hostname === hostname && url.port === Number(port)
    )
  }

  private isClusterReady(hostname: HostName) {
    return this.getReadyClusterDubboTransport(hostname).length > 0
  }

  private getReadyClusterDubboTransport(hostname: HostName) {
    const transports = this.dubboTransportMap.get(hostname)
    return [...transports].filter((transport) => transport.isAvailable)
  }

  private getAllReadyClusterHosts(hostnames: Set<HostName>) {
    return [...hostnames].filter((hostname: string) =>
      this.isClusterReady(hostname)
    )
  }

  private getAvailableDubboTransport(
    hostnames: Set<HostName>
  ): DubboTcpTransport {
    // 1. first, We find available clusters
    const allReadyHostnames = this.getAllReadyClusterHosts(hostnames)
    log('find all available clusters %s', allReadyHostnames)

    // 2. select one cluster
    const hostname = select<string>(allReadyHostnames, 'random')
    if (!hostname) {
      return null
    }

    // 3. get all transports
    const transports = this.getReadyClusterDubboTransport(hostname)
    log(
      'find all available transports %s',
      transports.map((t) => t.host)
    )

    const transport = select<DubboTcpTransport>(transports, 'random')
    log('last choose transport %s', transport.host)
    return transport
  }
}

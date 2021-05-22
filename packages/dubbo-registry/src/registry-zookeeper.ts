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
import Zookeeper from 'zookeeper'
import { IRegistry } from './registry'
import BaseRegistry from './registry-base'
import {
  INodeProps,
  IZkClientConfig,
  TDubboInterface,
  TDubboUrl,
} from './types'

const DUBBO_ZK_ROOT_PATH: string = '/dubbo'
const dlog = debug('dubbo:zookeeper~')

export class ZookeeperRegistry
  extends BaseRegistry
  implements IRegistry<Zookeeper> {
  private client: Zookeeper
  private props: IZkClientConfig

  private readyPromise: Promise<void>
  private resolve: Function
  private reject: Function

  constructor(props: IZkClientConfig) {
    super()
    dlog(`init zookeeper with %O`, props)
    this.props = props

    // init ready promise
    this.readyPromise = new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })

    this.init()
  }

  // ~~~~~~~~~~~~~~~~ private ~~~~~~~~~~~~~~~~~~~~~~~~~~
  private init() {
    // cache this.client
    if (this.client) {
      return this.client
    }

    // set default props value
    this.props.timeout = this.props.timeout || 5000
    this.props.debug_level =
      this.props.debug_level || Zookeeper.constants.ZOO_LOG_LEVEL_WARN
    this.props.host_order_deterministic =
      this.props.host_order_deterministic || false
    dlog('connecting zookeeper with %O', this.props)

    this.client = new Zookeeper(this.props)

    this.client.on('connect', async () => {
      dlog('connected with zookeeper with %s', this.props.connect)

      try {
        // create root node
        await this.mkdirp(DUBBO_ZK_ROOT_PATH)
        // trigger reeady promise
        this.resolve()
      } catch (err) {
        this.reject(err)
      }
    })

    this.client.on('close', () => {
      dlog(`zookeeper closed`)
      this.emitErr(new Error(`Zookeeper was closed`))
    })

    this.client.on('error', (err) => {
      dlog(`zookeeper error %s`, err)
      this.reject(err)
      this.emitErr(err)
    })

    process.nextTick(() => {
      this.client.init(this.props)
    })
  }

  private async createNode(cfg: INodeProps) {
    dlog(`create zookeeper node %j`, cfg)
    const { path, data = '', isPersistent = false } = cfg
    try {
      await this.client.exists(path, false)
      dlog(`${path} node was existed ~`)
    } catch (err) {
      dlog(
        `${path} was not existed %s, create path: %s, data: %s, isPersistence: %s`,
        err,
        path,
        data,
        isPersistent,
      )
      await this.client.create(
        path,
        data,
        isPersistent
          ? Zookeeper.constants.ZOO_PERSISTENT
          : Zookeeper.constants.ZOO_EPHEMERAL,
      )
    }
  }

  private async mkdirp(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.mkdirp(path, (err) => {
        if (err) {
          dlog(`mkdir %s error %s`, path, err)
          reject(err)
        } else {
          dlog('mkdir %s ok', path)
          resolve()
        }
      })
    })
  }

  private wrapWatch(dubboInterface: string) {
    const servicePath = `${DUBBO_ZK_ROOT_PATH}/${dubboInterface}/providers`
    return async (type: number, state: number) => {
      dlog('wrapWatch %s %d %d', servicePath, type, state)
      await this.findDubboServiceUrl(dubboInterface)
      this.emitData(this.dubboServiceUrlMap)
    }
  }

  // ~~~~~~~~~~~~~~~~ public ~~~~~~~~~~~~~~~~~~~~~~~~~~

  getProps() {
    return this.props
  }

  ready(): Promise<void> {
    return this.readyPromise
  }

  async findDubboServiceUrls(dubboInterfaces: Array<string>) {
    await Promise.all(
      dubboInterfaces.map((dubboInterface) =>
        this.findDubboServiceUrl(dubboInterface),
      ),
    )
    this.emitData(this.dubboServiceUrlMap)
  }

  async findDubboServiceUrl(dubboInterface: string) {
    const servicePath = `${DUBBO_ZK_ROOT_PATH}/${dubboInterface}/providers`
    const urls = (
      await this.client
        .w_get_children(servicePath, this.wrapWatch(dubboInterface))
        .catch((err) => {
          dlog(
            `get beehive service urls errro %s %s %s`,
            servicePath,
            dubboInterface,
            err,
          )
          return []
        })
    )
      .filter((v: string) => v.startsWith('dubbo://'))
      .map((v: string) => decodeURIComponent(v))
    this.dubboServiceUrlMap.set(dubboInterface, urls)
  }

  async registyServices(services: Array<[TDubboInterface, TDubboUrl]>) {
    for (let [dubboInterface, dubboUrl] of services) {
      // create service root path
      const serviceRootPath = `${DUBBO_ZK_ROOT_PATH}/${dubboInterface}/services`
      await this.mkdirp(serviceRootPath)
      // create service node
      await this.createNode({
        path: `${serviceRootPath}/${encodeURIComponent(dubboUrl)}`,
      })
    }
  }

  async registyConsumers(consumers: Array<[TDubboInterface, TDubboUrl]>) {
    const dubboInterfaces = new Set<string>()
    // registry consumer
    for (let [dubboInterface, dubboUrl] of consumers) {
      dubboInterfaces.add(dubboInterface)
      // create consumer root path
      const consumerRootPath = `/${DUBBO_ZK_ROOT_PATH}/${dubboInterface}/consumers`
      await this.mkdirp(consumerRootPath)
      // create service node
      await this.createNode({
        path: `${consumerRootPath}/${encodeURIComponent(dubboUrl)}`,
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

export function Zk(props: IZkClientConfig) {
  return new ZookeeperRegistry(props)
}

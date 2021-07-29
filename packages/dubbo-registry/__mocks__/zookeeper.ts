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
import EventEmitter from 'events'
import Zookeeper from 'zookeeper'
import { IZkClientConfig } from '../src/types'

const log = debug('dubbo:zookeeper:mock')

/**
 * mock node_modules/zookeeper
 */

export default class ZookeeperMock extends EventEmitter {
  static constants = Zookeeper.constants
  props: IZkClientConfig
  isConnectErr: boolean = false
  private cache: Map<string, Array<string>>

  constructor(props: IZkClientConfig) {
    super()
    this.props = props
    this.cache = new Map()
  }

  init() {
    log('init')
    if (this.isConnectErr) {
      log('emit error')
      this.emit('error', new Error(`zk could not connect`))
    } else {
      this.emit('connect')
      log('emit connect')
    }
  }

  mkdirp(path: string, cb: Function) {
    log(`mkdir ${path}`)
    this.cache.set(path, [])
    cb(null)
  }

  mockConnectErr() {
    this.isConnectErr = true
  }

  create(
    path: string,
    data: string | Buffer,
    isPersistent: boolean
  ): Promise<void> {
    log(`create with ${JSON.stringify({ path, data, isPersistent })} `)
    return new Promise((resolve) => {
      const paths = path.split('/')
      const dir = paths.splice(0, 4).join('/')
      this.cache.get(dir).push(paths[0])
      resolve()
    })
  }

  exists(path: string) {
    return Promise.reject(new Error(`${path} was not exists`))
  }

  w_get_children(servicePath: string) {
    return Promise.resolve(this.cache.get(servicePath) || [])
  }

  close() {
    log('close zookeeper')
  }
}

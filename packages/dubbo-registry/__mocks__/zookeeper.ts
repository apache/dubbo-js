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

import EventEmitter from 'events'
import Zookeeper from 'zookeeper'
import { IZkClientConfig } from '../src/types'

/**
 * mock node_modules/zookeeper
 */

export default class Zoookeeper extends EventEmitter {
  static constants = Zookeeper.constants
  props: IZkClientConfig
  isConnectErr: boolean = false

  constructor(props: IZkClientConfig) {
    super()
    this.props = props
  }

  init() {
    console.log('init')
    if (this.isConnectErr) {
      console.log('emit error')
      this.emit('error', new Error(`zk could not connect`))
    } else {
      this.emit('connect')
      console.log('emit connect')
    }
  }

  mkdirp(path: string, cb: Function) {
    console.log(`mkdir ${path}`)
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
    console.log(`create with ${JSON.stringify({ path, data, isPersistent })} `)
    return new Promise((resolve) => {
      resolve()
    })
  }

  exists(path: string) {
    console.log(`exists not path ${path}`)
    return Promise.reject(new Error(`node was not exists`))
  }

  w_get_children(servicePath: string) {
    const dubboInterface = servicePath.split('.')[1]
    return Promise.resolve([
      `dubbo://127.0.0.1:20880/${dubboInterface}?methods=hello&group=&version=0.0.0`
    ])
  }
}

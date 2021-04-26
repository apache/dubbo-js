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

import getPort from 'get-port'
import debug from 'debug'

const dlog = debug('dubbo-server:get-port')

export async function randomPort() {
  // 本地空闲的端口
  // 在多进程同时启动的时候，端口的获取不是竞态的，所以可能导致不同的进程获取的端口是相同的
  // 这时候只有其中一个进程listen该端口，导致其他的进程，监听失败，导致进程启动失败
  //
  // 通过以下核心方式来解决
  // 获取一段的空闲端口，随机选择一个， 通过随机来降低端口冲突的概率
  // 如果冲突 再次获取
  const ports = []
  for (let i = 0; i < 10; i++) {
    const port = await getPort({port: getPort.makeRange(20888, 30000)})
    ports.push(port)
  }
  dlog(`get ports %s`, ports.join())
  return ports[Math.floor(Math.random() * 10)]
}

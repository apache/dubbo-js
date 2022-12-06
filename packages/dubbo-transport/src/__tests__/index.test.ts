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

import { DubboClientTransport, DubboServerTransport } from '../index'

describe(`dubbo-transport`, () => {
  it('test dubbo-transport', () => {
    // 创建服务端 transport 实例
    const server = new DubboServerTransport({
      url: 'http://localhost:3600',
      port: 3600
    })
    expect(server.port).toBe(3600)
    // 创建客户端 transport 实例
    const client = new DubboClientTransport({
      url: 'http://localhost:3600',
      port: 3600
    })
    expect(client.url).toBe('http://localhost:3600')
  })
})

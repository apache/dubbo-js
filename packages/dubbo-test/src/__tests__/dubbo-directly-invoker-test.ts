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

import path from 'path'
import fs from 'fs-extra'
import { Zk } from 'apache-dubbo-registry'
import { DubboDirectlyInvoker, java } from 'apache-dubbo-consumer'
import { DubboService } from 'apache-dubbo-service'
import consumer from '../providers/org/apache/dubbo/demo/consumer'
import provider from '../providers/org/apache/dubbo/demo/provider'
import { UserRequest } from '../providers/org/apache/dubbo/demo/UserRequest'

let dubbo: DubboDirectlyInvoker = null
let dubboService: DubboService = null
let demoService = null
const zk = Zk({ connect: 'localhost:2182' })

beforeAll(async () => {
  dubboService = new DubboService({
    registry: zk,
    services: provider
  })

  await dubboService.ready()

  dubbo = DubboDirectlyInvoker.from({
    dubboHost: `127.0.0.1:${dubboService.getPort()}`,
    dubboVersion: '2.0.2'
  })
  demoService = consumer.DemoProvider(dubbo as any)
})

afterAll(async () => {
  // clear port file
  fs.unlinkSync(
    path.join(process.cwd(), '.dubbojs', String(dubboService.getPort()))
  )
  dubbo.close()
  await dubboService.close()
})

describe('dubbo test suite', () => {
  it('test demo type provider', async () => {
    const hello = await demoService.sayHello(java.String('dubbo'))
    expect(hello.res).toEqual('hello dubbo')
    expect(hello.err).toBeNull()
    const echo = await demoService.echo()
    expect(echo.res).toEqual('pong')
    expect(echo.err).toBeNull()
    const test = await demoService.test()
    expect(test.res).toBeNull()
    expect(test.err).toBeNull()
    const userInfo = await demoService.getUserInfo(
      new UserRequest({
        id: 1,
        name: 'dubbo-js',
        email: 'hufeng@apache.org'
      })
    )
    expect(userInfo.res).toEqual({
      info: { id: '1', name: 'dubbo-js', email: 'hufeng@apache.org' },
      status: 'ok'
    })
  })
})

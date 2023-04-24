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

import path from 'node:path'
import fs from 'fs-extra'
import { Zk } from 'apache-dubbo-registry'
import { Dubbo, java } from 'apache-dubbo-consumer'
import { DubboService } from 'apache-dubbo-service'
import consumer from '../providers/org/apache/dubbo/demo/consumer'
import provider from '../providers/org/apache/dubbo/demo/provider'
import { UserRequest } from '../providers/org/apache/dubbo/demo/UserRequest'
import { TypeRequest } from '../providers/org/apache/dubbo/demo/TypeRequest'

describe('dubbo test suite', () => {
  const zk = Zk({ connect: 'localhost:2182' })
  let dubbo: Dubbo<typeof consumer>
  const dubboService = new DubboService({
    registry: zk,
    services: provider
  })

  beforeAll(async () => {
    await dubboService.ready()
    dubbo = new Dubbo({
      application: { name: 'dubbo-test' },
      registry: zk,
      services: consumer,
      dubboMaxTimeout: 100 * 1000
    })
    await dubbo.ready()
  })

  it('test demo type provider', async () => {
    const hello = await dubbo.service.DemoProvider.sayHello(
      java.String('dubbo')
    )
    expect(hello).toEqual('hello dubbo')

    const echo = await dubbo.service.DemoProvider.echo()
    expect(echo).toEqual('pong')

    const test = await dubbo.service.DemoProvider.test()
    expect(test).toBeNull()

    const userInfo = await dubbo.service.DemoProvider.getUserInfo(
      new UserRequest({
        id: 1,
        name: 'dubbo-js',
        email: 'hufeng@apache.org'
      })
    )
    expect(userInfo).toEqual({
      info: { id: '1', name: 'dubbo-js', email: 'hufeng@apache.org' },
      status: 'ok'
    })
  })

  it('test BasicTypeProvider ', async () => {
    const basicType = await dubbo.service.BasicTypeProvider.testBasicType(
      new TypeRequest({
        bigDecimal: { value: '1.0' },
        map: { ping: 'pong' }
      })
    )
    expect(basicType).toEqual({
      bigDecimal: { value: '1.0' },
      map: { ping: 'pong' }
    })
  })

  it('test ErrorProvider', async () => {
    try {
      const result = await dubbo.service.ErrorProvider.errorTest()
      expect(result).toBeNull()
    } catch (err) {
      expect(err.message).toEqual('exception')
    }
  })

  afterAll(async () => {
    // clear port file
    fs.unlinkSync(
      path.join(process.cwd(), '.dubbojs', String(dubboService.getPort()))
    )

    dubbo.close()
    await dubboService.close()
  })
})

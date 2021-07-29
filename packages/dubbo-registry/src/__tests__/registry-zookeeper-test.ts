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

import Zookeeper from 'zookeeper'
import { Zk } from '../registry-zookeeper'

describe('test zookeeper registry', () => {
  it('test throw connection url error', () => {
    try {
      Zk({
        connect: ''
      })
    } catch (err) {
      expect(err.message).toEqual('Please specify zookeeper connect url')
    }
  })

  it('test zk props and ready ok', async () => {
    const zk = Zk({
      connect: 'localhost:2181'
    })
    expect(zk.getProps()).toEqual({
      connect: 'localhost:2181',
      timeout: 40000,
      debug_level: Zookeeper.constants.ZOO_LOG_LEVEL_WARN,
      host_order_deterministic: false,
      zkRootPath: '/dubbo'
    })
    const res = await zk.ready()
    expect(res).toBeUndefined()

    zk.close()
  })

  it('test zk with zkRootPath and ready ok', async () => {
    const zk = Zk({
      connect: 'localhost:2181',
      zkRootPath: '/test/com.demo.dubbo'
    })

    expect(zk.getProps()).toEqual({
      connect: 'localhost:2181',
      timeout: 40000,
      debug_level: Zookeeper.constants.ZOO_LOG_LEVEL_WARN,
      host_order_deterministic: false,
      zkRootPath: '/test/com.demo.dubbo'
    })
    const res = await zk.ready()
    expect(res).toBeUndefined()

    zk.close()
  })

  it('test zk ready failed', async () => {
    const zk = Zk({
      connect: 'localhost:2181'
    })
    zk.subscribe({
      onData() {},
      onError(err) {
        expect(err.message).toEqual(`zk could not connect`)
      }
    })
    const client = zk.getClient()
    //@ts-ignore
    client.mockConnectErr()

    const err = await zk.ready().catch((err) => err)
    expect(err instanceof Error).toBeTruthy()

    zk.close()
  })

  it('test registerServices', async () => {
    const services = [
      {
        dubboServiceInterface: 'org.apache.demo.service.HelloService',
        dubboServiceUrl:
          'dubbo://127.0.01:20880/org.apache.demo.HelloService?interface=org.apache.demo.service.HelloService&methods=sayHello,test,echo,getUserInfo&version=1.0.0'
      },
      {
        dubboServiceInterface: 'org.apache.demo.service.UserService',
        dubboServiceUrl:
          'dubbo://127.0.01:20880/org.apache.demo.UserService?interface=org.apache.demo.service.UserService&methods=sayHello,test,echo,getUserInfo&version=1.0.0'
      }
    ]

    const zk = Zk({
      connect: 'localhost:2181'
    })

    await zk.ready()
    await zk.registerServices(services)

    zk.close()
  })

  it('test registryConsumer', async () => {
    const services = [
      {
        dubboServiceInterface: 'org.apache.demo.service.HelloService',
        dubboServiceUrl:
          'consumer://127.0.01:20880/org.apache.demo.HelloService?version=1.0.0'
      },
      {
        dubboServiceInterface: 'org.apache.demo.service.UserService',
        dubboServiceUrl:
          'consumer://127.0.01:20880/org.apache.demo.UserService?version=1.0.0'
      }
    ]
    const zk = Zk({ connect: 'localhost:2181' })
    zk.subscribe({
      onData(data) {
        expect(data).toMatchSnapshot()
      },
      onError(err) {
        expect(err).toMatchSnapshot()
      }
    })
    await zk.ready()
    await zk.registerConsumers(services)
    zk.close()
  })
})

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

let logBuff = [] as Array<string>

jest.spyOn(console, 'log').mockImplementation((arg: string) => {
  logBuff.push(arg)
})

beforeEach(() => {
  logBuff = []
})

it('test zk props and ready ok', async () => {
  const zk = Zk({
    connect: 'localhost:2181'
  })
  expect(zk.getProps()).toEqual({
    connect: 'localhost:2181',
    timeout: 5000,
    debug_level: Zookeeper.constants.ZOO_LOG_LEVEL_WARN,
    host_order_deterministic: false
  })
  const res = await zk.ready()
  expect(res).toBeUndefined()
  expect(logBuff).toEqual(['init', 'mkdir /dubbo', 'emit connect'])
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
  expect(logBuff).toEqual(['init', 'emit error'])
})

it('test registryConsumers', () => {})

it('test registyService', async () => {
  const map = new Map([
    [
      'org.apache.demo.service.HelloService',
      'dubbo://127.0.01:20880/org.apache.demo.HelloService?interface=org.apache.demo.service.HelloService&methods=sayHello,test,echo,getUserInfo&version=1.0.0'
    ],
    [
      'org.apache.demo.service.UserService',
      'dubbo://127.0.01:20880/org.apache.demo.UserService?interface=org.apache.demo.service.UserService&methods=sayHello,test,echo,getUserInfo&version=1.0.0'
    ]
  ])

  const zk = Zk({
    connect: 'localhost:2181'
  })

  await zk.registyServices(map)
  expect(logBuff).toMatchSnapshot()
})

it('test registryConsumer', async () => {
  const map = new Map([
    [
      'org.apache.demo.service.HelloService',
      'consumer://127.0.01:20880/org.apache.demo.HelloService?version=1.0.0'
    ],
    [
      'org.apache.demo.service.UserService',
      'consumer://127.0.01:20880/org.apache.demo.UserService?version=1.0.0'
    ]
  ])
  const zk = Zk({ connect: 'localhost:2181' })
  zk.subscribe({
    onData(data) {
      expect(data).toMatchSnapshot()
    },
    onError(err) {}
  })
  await zk.registyConsumers(map)
  expect(logBuff).toMatchSnapshot()
})

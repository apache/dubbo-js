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

import { IRegistry } from 'apache-dubbo-registry'
import DubboTcpTransport from './dubbo-tcp-transport'
import { DubboSetting } from './dubbo-setting'

export type TQueueObserver = Function
export type TRequestId = number
export type TDubboInterface = string
export type TDubboUrl = string
export type TDubboServiceShortName = string
export type TMatchThunk = (shortName: TDubboServiceShortName) => IDubboSetting

export type Middleware<T> = (context: T, next: () => Promise<any>) => any

export interface IDubboProps {
  // 当前的应用标识
  application: { name: string }
  registry: IRegistry<Object>
  //当前要注册到dubbo容器的服务对象
  services: Object
  isSupportedDubbox?: boolean
  //dubbo调用最大超时时间单位为秒，默认5000
  dubboInvokeTimeout?: number
  dubboVersion?: string
  dubboSetting?: DubboSetting
}

export type TDubboService<T> = {
  [k in keyof T]: T[k] extends (dubbo: any) => infer R ? R : any
}

export interface IDubboProvider {
  dubboInterface: string
  path?: string
  version?: string
  timeout?: number
  group?: string
  methods: { [methodName: string]: Function }
}

export interface IDirectlyDubboProps {
  dubboHost: string
  dubboVersion: string
  dubboInvokeTimeout?: number
}

export interface IHessianType {
  $class: string
  $: any
}
export interface IInvokeParam {
  dubboInterface: string
  methods: { [methodName: string]: Function }
  path?: string
  group?: string
  version?: string
  timeout?: number
  attachments?: object
  isSupportedDubbox?: boolean
}

export interface IDubboObservable<T> {
  subscribe(subscriber: T): this
}

export interface IDubboTransportSubscriber {
  onConnect: (props: { host: string; transport: DubboTcpTransport }) => void
  onData: (data: any) => void
  onClose: (host: string) => void
}

export type HostName = string
export type Host = string

export interface IQueryObj {
  application: string
  dubbo: string
  interface: string
  path: string
  methods: string
  version: string
  group: string
}

export interface IDubboSetting {
  group?: string
  version?: string
  timeout?: number
}

export interface IDubboSetting {
  group?: string
  version?: string
  timeout?: number
}

export interface IDubboResult<T> {
  err: Error
  res: T
}

export type TDubboCallResult<T> = Promise<IDubboResult<T>>

export interface IContextRequestParam {
  requestId: number
  dubboVersion: string
  dubboInterface: string
  path: string
  methodName: string
  methodArgs: Array<IHessianType>
  version: string
  timeout: number
  group: string
}

export interface IDubboResponse {
  requestId: number
  res?: any
  err?: Error

  attachments?: Object
}

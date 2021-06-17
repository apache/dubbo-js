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

import net from 'net'
import Request from './request'

export type TDecodeBuffSubscriber = (data: Buffer) => void

export interface IObservable<T> {
  subscribe(subscriber: T): this
}

export interface IDubboResponse<T> {
  requestId: number
  err: Error | null
  res: T | null
  attachments: Object
}

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

export interface IHessianType {
  $class: string
  $: any
}

export interface IRequestContext {
  requestId: number
  dubboVersion: string
  dubboInterface: string
  version: string
  methodName: string
  methodArgs: Array<IHessianType>
  isSupportedDubbox: boolean
  path: string
  group: string
  timeout: number
  application: { name: string }
  attachments: any
  request: IContextRequestParam
}

export interface IResponseContext {
  request: Request
  status: number
  body: any
  attachments: Object
}

export interface IHeartBeatProps {
  type: 'request' | 'response'
  transport: net.Socket
  onTimeout?: Function
}

export interface IAttachment {
  path: string
  interface: string
  /**
   * interface version
   */
  version: string
  /**
   * dubbo version
   */
  dubbo: string
  group?: string
  timeout?: number
  name?: {
    application: { name: string }
  }
}

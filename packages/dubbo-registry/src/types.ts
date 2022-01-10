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

export type TDubboInterface = string
export type TDubboUrl = string

export interface ITimeoutProps {
  maxTimeout?: number
  onTimeout: () => void
}

export interface INaocsClientProps {
  namespace?: string
  connect: string
  logger?: Console
}
export interface IRegistrySubscriber {
  onData: (map: Map<TDubboInterface, Array<TDubboUrl>>) => void
  onError: (err: Error) => void
}

export interface IZkClientConfig {
  connect: string
  timeout?: number
  debug_level?: number
  host_order_deterministic?: boolean
  zkRootPath?: string
}

export interface INodeProps {
  path: string
  data?: Buffer | string
  isPersistent?: boolean
}

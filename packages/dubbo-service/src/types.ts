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

import { DubboSetting } from './dubbo-setting'

export type TDubboServiceUrl = string
export type TDubboServiceShortName = string
export type TDubboServiceInterface = string
export type DubboServiceClazzName = string
export type TMatchThunk = (
  shortName: TDubboServiceShortName
) => IDubboServiceSetting

export interface IDubboServerProps {
  application?: { name: string }
  dubbo?: string
  registry: IRegistry<any>
  services: { [name in string]: IDubboService }
  dubboSetting?: DubboSetting
}

export interface IDubboService {
  dubboInterface: string
  group?: string
  version?: string
  methods: { [key in string]: Function }
}

export interface IDubboServiceSetting {
  group?: string
  version?: string
  timeout?: number
}

export interface IRegistry<T = Object> {
  ready(): Promise<void>
  registerServices(
    services: Array<{
      dubboServiceInterface: TDubboServiceInterface
      dubboServiceUrl: TDubboServiceUrl
    }>
  ): Promise<void>
  getClient(): T

  close(): void
}

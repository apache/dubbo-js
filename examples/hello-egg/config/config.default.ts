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

import {EggAppConfig, EggAppInfo, PowerPartial} from 'egg'

// for config.{env}.ts
export type DefaultConfig = PowerPartial<EggAppConfig & BizConfig>

// app special config scheme
export interface BizConfig {
  sourceUrl: string
}

export default (appInfo: EggAppInfo) => {
  const config = {} as PowerPartial<EggAppConfig> & BizConfig

  // override config from framework / plugin
  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1528804995511_9134'

  // add your config here
  config.middleware = []

  /**
   * dubbo config
   *
   * application 当前的应用标识
   * registry 注册中心地址
   *   support registry mode
   *     1、 zookeeper  'localhost:2181,localhost:2182,localhost:2183'
   *     2、 nacos      'nacos://localhost:2181'
   *       nacos 注册地址要以 nacos:// 开头
   *
   */
  config.dubbo = {
    application: {name: 'node-egg-bff'},
    // zookeeper 的链接
    registry: 'localhost:2181,localhost:2182,localhost:2183',
    // nacos 的链接 要以 nacos:// 开头
    // registry: 'nacos://localhost:8848',
  }

  return config
}

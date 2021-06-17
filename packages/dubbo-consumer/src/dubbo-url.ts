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

import debug from 'debug'
import qs from 'querystring'
import { IQueryObj } from './types'

const log = debug('dubbo:dubbo-url')

/**
 *
 * parse dubbo service url
 *
 * @param dubboUrl dubbo的url
 */
export default class DubboUrl {
  private readonly url: URL
  private readonly query: IQueryObj

  //===================public fields and methods============
  public readonly hostname: string
  public readonly port: number
  public readonly path: string
  public readonly dubboVersion: string
  public readonly version: string
  public readonly group: string

  private constructor(dubboServiceUrl: string) {
    log('DubboUrl from -> %s', dubboServiceUrl)
    this.url = new URL(dubboServiceUrl)
    this.query = qs.parse(dubboServiceUrl) as any

    this.hostname = this.url.hostname
    this.port = Number(this.url.port)
    this.path = this.url.pathname.substring(1)
    this.dubboVersion = this.query.dubbo || ''
    this.version =
      this.query.version || this.query['default.version'] || '0.0.0'
    this.group = this.query.group || this.query['default.group'] || ''
  }

  static from(dubboServiceUrl: string) {
    return new DubboUrl(dubboServiceUrl)
  }
}

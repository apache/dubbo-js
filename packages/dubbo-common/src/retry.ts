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
import { IRetryProps } from './types'

const MAX_RETRIES = 10
const dlog = debug('dubbo-server:retry~')

export class Retry {
  private retryNum: number
  private readonly delay: number
  private readonly maxRetryCount: number

  private readonly retry: Function
  private readonly end: Function

  constructor(props: IRetryProps) {
    this.maxRetryCount = props.maxRetry || MAX_RETRIES
    this.retryNum = this.maxRetryCount
    this.retry = props.retry
    this.end = props.end
    this.delay = props.delay || 1000
    dlog(`init props: %j`, {
      delay: this.delay
    })
  }

  static from(props: IRetryProps) {
    return new Retry(props)
  }

  start() {
    dlog(`starting retry, current retry num:%d`, this.retryNum)
    // stop retry
    if (this.retryNum === 0) {
      this.end()
      return
    }
    // retry
    setTimeout(() => {
      this.retry()
      this.retryNum--
    }, this.delay)
  }

  reset() {
    dlog('reset')
    this.retryNum = this.maxRetryCount
  }
}

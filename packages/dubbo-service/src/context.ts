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

import { d$ } from 'apache-dubbo-common'
import { Request } from 'apache-dubbo-serialization'

export default class Context<T = any> {
  private readonly req: Request
  /**
   * dubbo service result
   */
  private readonly _body: { res: T; err: Error }
  /**
   * attachment
   */
  private _attachments: Object
  /**
   * server status
   */
  private _status: number

  constructor(req: Request) {
    this.req = req
    this._attachments = {}
    this._body = { res: null, err: null }
  }

  get request() {
    return this.req
  }

  get body() {
    return this._body
  }

  get attachments(): Object {
    return this._attachments
  }

  set attachments(val: Object) {
    this._attachments = {
      ...this._attachments,
      ...val
    }
  }

  set status(code: d$.DUBBO_RESPONSE_STATUS) {
    this._status = code
  }

  get status() {
    return this._status
  }
}

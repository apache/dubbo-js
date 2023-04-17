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

export interface IResult<T = object> {
  res: T
  err: Error | null
}

export default class Context {
  private path: string
  private method: string
  private args: Array<any>
  private body: IResult

  constructor() {
    this.path = ''
    this.method = ''
    this.args = []
    this.body = {
      res: {},
      err: null
    }
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~ setter && getter ~~~~~~~~~~~~~~~~~~~~~~~~~~~
  getPath() {
    return this.path
  }

  setPath(path: string) {
    this.path = path
    return this
  }

  getMethod() {
    return this.method
  }

  setMethod(method: string) {
    this.method = method
    return this
  }

  getBody() {
    return this.body
  }

  setBody(result: IResult) {
    this.body = { ...this.body, ...result }
    return this
  }

  // ~~~~~~~~~~~~~~~~~~~~~~serialization parameter ~~~~~~~~~~~~~~~~~~~~~~~~
  get serialization() {
    return JSON.stringify({
      path: this.path,
      methodName: this.method,
      methodArgs: this.args
    })
  }
}

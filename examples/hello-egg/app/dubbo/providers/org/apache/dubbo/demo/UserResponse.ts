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

import java from 'js-to-java'

export interface IUserResponse {
  status?: string
  info?: { [name: string]: string }
}

export class UserResponse {
  constructor(params: IUserResponse) {
    this.status = params.status
    this.info = params.info
  }

  status?: string
  info?: { [name: string]: string }

  __fields2java() {
    let infoMapTransfer = new Map()
    for (let mapKey in this.info) {
      infoMapTransfer.set(java.String(mapKey), java.String(this.info[mapKey]))
    }
    return {
      $class: 'org.apache.dubbo.demo.UserResponse',
      $: { status: java.String(this.status), info: java.Map(infoMapTransfer) }
    }
  }
}

//generate by interpret-cli apache-dubbo-js

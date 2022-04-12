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
import { Sex } from './Sex'

export interface IUserRequest {
  sex?: Sex
  name?: string
  id?: number
  email?: string
}

export class UserRequest {
  constructor(params: IUserRequest) {
    this.sex = params.sex
    this.name = params.name
    this.id = params.id
    this.email = params.email
  }

  sex?: Sex
  name?: string
  id?: number
  email?: string

  __fields2java() {
    return {
      $class: 'org.apache.dubbo.demo.UserRequest',
      $: {
        sex: java['enum']('org.apache.dubbo.demo.Sex', Sex[this.sex]),
        name: java.String(this.name),
        id: java.Integer(this.id),
        email: java.String(this.email)
      }
    }
  }
}

//generate by interpret-cli apache-dubbo-js

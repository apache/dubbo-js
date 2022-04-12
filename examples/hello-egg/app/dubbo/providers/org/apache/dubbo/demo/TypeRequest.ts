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

export interface ITypeRequest {
  bigDecimal?: { value: string }
  map?: { [name: string]: string }
}

export class TypeRequest {
  constructor(params: ITypeRequest) {
    this.bigDecimal = params.bigDecimal
    this.map = params.map
  }

  bigDecimal?: { value: string }
  map?: { [name: string]: string }

  __fields2java() {
    let mapMapTransfer = new Map()
    for (let mapKey in this.map) {
      mapMapTransfer.set(java.String(mapKey), java.String(this.map[mapKey]))
    }
    return {
      $class: 'org.apache.dubbo.demo.TypeRequest',
      $: {
        bigDecimal: this.bigDecimal
          ? java.BigDecimal(this.bigDecimal.value)
          : null,
        map: java.Map(mapMapTransfer)
      }
    }
  }
}

//generate by interpret-cli apache-dubbo-js

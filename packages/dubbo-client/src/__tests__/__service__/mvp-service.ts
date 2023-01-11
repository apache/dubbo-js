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

export interface IMvp {
  SayHello(req: HelloRequest): Promise<HelloReply>
  Check(req: HealthCheckRequest): Promise<HealthCheckResponse>
}

export interface DubboClientsTstubService {
  mvp: IMvp
}
// define enum
enum ServingStatus {
  UNKNOWN = 0,
  SERVING = 1,
  NOT_SERVING = 2,
  SERVICE_UNKNOWN = 3 // Used only by the Watch method.
}

// define request && response, 实际代码可以根据不同的namespace生成到不同的目录
export interface HealthCheckResponse {
  status: ServingStatus
}

export interface HealthCheckRequest {
  service: string
}

export interface HelloRequest {
  name: string
}

export interface HelloReply {
  message: string
}

export const Mvp = {
  SayHello: {
    path: '/helloworld.Mvp/SayHello',
    encode(data: HelloRequest) {
      return 'helloworld.HelloRequest'
    },
    decode(data: any) {
      return 'helloworld.HelloReply'
    }
  },
  Check: {
    path: '/helloworld.Mvp/Check',
    encode(data: HealthCheckRequest) {
      return 'helloworld.HealthCheckRequest'
    },
    decode(data: any) {
      return 'helloworld.HealthCheckResponse'
    }
  }
}

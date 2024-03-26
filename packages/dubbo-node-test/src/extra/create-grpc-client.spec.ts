// Copyright 2021-2023 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { TestService } from '../gen/grpc/testing/test_dubbo.js'
import { createGrpcClient } from './create-grpc-client.js'
import * as grpc from '@grpc/grpc-js'

describe('createGrpcClient()', function () {
  it('should create the expected methods', function () {
    const grpcClient = createGrpcClient(TestService, {
      address: 'localhost:5002',
      channelCredentials: grpc.ChannelCredentials.createInsecure(),
      clientOptions: {},
      binaryOptions: {}
    })
    expect(grpcClient).toBeDefined()
    expect(typeof grpcClient.emptyCall).toBe('function')
    expect(typeof grpcClient.streamingOutputCall).toBe('function')
    expect(typeof grpcClient.streamingInputCall).toBe('function')
    expect(typeof grpcClient.fullDuplexCall).toBe('function')
  })
})

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

import { createCallbackClient, createPromiseClient } from '@apachedubbo/dubbo'
import type { Transport } from '@apachedubbo/dubbo'
import { TestService } from '../gen/grpc/testing/test_dubbo.js'
import { SimpleRequest } from '../gen/grpc/testing/messages_pb.js'
import { createTestServers } from '../helpers/testserver.js'

function ensureProtocolName(expectedName: string) {
  return (header: Headers) => {
    expect(header.get('request-protocol')).toEqual(expectedName)
  }
}

function testForProtocol(expectedProtocolName: string) {
  return (transportFactory: () => Transport) => {
    const request = new SimpleRequest({
      responseSize: 1024,
      payload: {
        body: new Uint8Array(1024).fill(0)
      }
    })
    it('with promise client', async function () {
      const transport = transportFactory()
      const client = createPromiseClient(TestService, transport)
      const response = await client.unaryCall(request, {
        onHeader: ensureProtocolName(expectedProtocolName)
      })
      expect(response.payload).toBeDefined()
      expect(response.payload?.body.length).toEqual(request.responseSize)
    })
    it('with callback client', function (done) {
      const transport = transportFactory()
      const client = createCallbackClient(TestService, transport)
      client.unaryCall(
        request,
        (err, response) => {
          expect(err).toBeUndefined()
          expect(response.payload).toBeDefined()
          expect(response.payload?.body.length).toEqual(request.responseSize)
          done()
        },
        { onHeader: ensureProtocolName(expectedProtocolName) }
      )
    })
  }
}

describe('protocolName', function () {
  const servers = createTestServers()
  beforeAll(async () => await servers.start())

  servers.describeTransportsOnly(
    [
      '@apachedubbo/dubbo-node (gRPC, binary, http2) against @apachedubbo/dubbo-node (h2)'
    ],
    testForProtocol('grpc')
  )

  servers.describeTransportsOnly(
    [
      '@apachedubbo/dubbo-node (gRPC-web, binary, http2) against @apachedubbo/dubbo-node (h2c)'
    ],
    testForProtocol('grpc-web')
  )

  servers.describeTransportsOnly(
    [
      '@apachedubbo/dubbo-node (Triple, binary, http2, gzip) against @apachedubbo/dubbo-node (h2c)'
    ],
    testForProtocol('connect')
  )

  afterAll(async () => await servers.stop())
})

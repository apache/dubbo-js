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

import {
  Code,
  DubboError,
  createCallbackClient,
  createPromiseClient
} from '@apachedubbo/dubbo'
import {
  createDubboTransport,
  createGrpcTransport,
  createGrpcWebTransport
} from '@apachedubbo/dubbo-node'
import { TestService } from '../gen/grpc/testing/test_dubbo.js'
import { PayloadType } from '../gen/grpc/testing/messages_pb.js'

describe('unresolvable_host', function () {
  const baseOptions = {
    baseUrl: 'https://unresolvable-host.some.domain'
  }
  const optionsHttp2 = {
    ...baseOptions,
    httpVersion: '2' as const
  }
  const optionsHttp1 = {
    ...baseOptions,
    httpVersion: '1.1' as const
  }
  const transports = [
    [
      '@apachedubbo/dubbo-node (gRPC-web, http2)',
      createGrpcWebTransport(optionsHttp2)
    ],
    [
      '@apachedubbo/dubbo-node (gRPC-web, http)',
      createGrpcTransport(optionsHttp1)
    ],
    [
      '@apachedubbo/dubbo-node (Triple, http2)',
      createDubboTransport(optionsHttp2)
    ],
    [
      '@apachedubbo/dubbo-node (Triple, http)',
      createDubboTransport(optionsHttp1)
    ],
    [
      '@apachedubbo/dubbo-node (gRPC, http2)',
      createGrpcTransport(optionsHttp2)
    ],
    ['@apachedubbo/dubbo-node (gRPC, http)', createGrpcTransport(optionsHttp1)]
  ] as const
  for (const [name, transport] of transports) {
    describe(`${name} against unresolvable domain`, function () {
      describe('with promise client', function () {
        const client = createPromiseClient(TestService, transport)
        describe('for unary', function () {
          it('should raise code unavailable', async function () {
            try {
              await client.unaryCall({})
              fail('expected an error')
            } catch (e) {
              expect(DubboError.from(e).message).toBe(
                '[unavailable] getaddrinfo ENOTFOUND unresolvable-host.some.domain'
              )
              expect(e).toBeInstanceOf(DubboError)
            }
          })
        })
        describe('for server-streaming', function () {
          it('should raise code unavailable', async function () {
            try {
              for await (const res of client.streamingOutputCall({})) {
                fail('expected to catch an error')
                expect(res).toBeDefined() // only to satisfy type checks
              }
              fail('expected to catch an error')
            } catch (e) {
              expect(DubboError.from(e).message).toBe(
                '[unavailable] getaddrinfo ENOTFOUND unresolvable-host.some.domain'
              )
              expect(e).toBeInstanceOf(DubboError)
            }
          })
        })
        describe('for client-streaming', function () {
          it('should raise code unavailable', async function () {
            async function* input() {
              yield {
                payload: {
                  body: new Uint8Array(),
                  type: PayloadType.COMPRESSABLE
                }
              }
              await new Promise((resolve) => setTimeout(resolve, 1))
              yield {
                payload: {
                  body: new Uint8Array(),
                  type: PayloadType.COMPRESSABLE
                }
              }
              await new Promise((resolve) => setTimeout(resolve, 1))
              yield {
                payload: {
                  body: new Uint8Array(),
                  type: PayloadType.COMPRESSABLE
                }
              }
            }
            try {
              await client.streamingInputCall(input())
              fail('expected error')
            } catch (e) {
              expect(e).toBeInstanceOf(DubboError)
              const err = DubboError.from(e)
              expect(err.code).toBe(Code.Unavailable)
            }
          })
        })
        describe('for bidi-streaming', function () {
          it('should raise code unavailable', async function () {
            async function* input() {
              yield {
                responseParameters: [
                  {
                    size: 1
                  }
                ]
              }
              await new Promise((resolve) => setTimeout(resolve, 1))
              yield {
                responseParameters: [
                  {
                    size: 1
                  }
                ]
              }
              await new Promise((resolve) => setTimeout(resolve, 1))
              yield {
                responseParameters: [
                  {
                    size: 1
                  }
                ]
              }
            }
            try {
              for await (const res of client.fullDuplexCall(input())) {
                expect(res).toBeDefined() // only to satisfy type checks
                fail('expected to catch an error')
              }
              fail('expected to catch an error')
            } catch (e) {
              expect(e).toBeInstanceOf(DubboError)
              const err = DubboError.from(e)
              expect(err.code).toBe(Code.Unavailable)
            }
          })
        })
      })
      describe('with callback client', function () {
        const client = createCallbackClient(TestService, transport)
        describe('for unary', function () {
          it('should raise code unavailable', function (done) {
            client.unaryCall({}, (error) => {
              expect(error?.code).toBe(Code.Unavailable)
              done()
            })
          })
        })
        describe('for server-streaming', function () {
          it('should raise code unavailable', function (done) {
            client.streamingOutputCall(
              {},
              () => {
                fail('expected error')
              },
              (error) => {
                expect(error?.code).toBe(Code.Unavailable)
                done()
              }
            )
          })
        })
      })
    })
  }
})

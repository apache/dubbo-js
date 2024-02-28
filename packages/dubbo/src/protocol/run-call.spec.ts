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
  Int32Value,
  MethodKind,
  type ServiceType,
  StringValue
} from '@bufbuild/protobuf'
import { runStreamingCall, runUnaryCall } from './run-call.js'
import type {
  StreamRequest,
  StreamResponse,
  UnaryRequest,
  UnaryResponse
} from '../interceptor.js'
import { createAsyncIterable } from './async-iterable.js'

const TestService = {
  typeName: 'TestService',
  methods: {
    unary: {
      name: 'Unary',
      I: Int32Value,
      O: StringValue,
      kind: MethodKind.Unary
    },
    serverStreaming: {
      name: 'ServerStreaming',
      I: Int32Value,
      O: StringValue,
      kind: MethodKind.ServerStreaming
    }
  }
} satisfies ServiceType

describe('runUnaryCall()', function () {
  function makeReq() {
    return {
      stream: false as const,
      service: TestService,
      method: TestService.methods.unary,
      url: `https://example.com/TestService/Unary`,
      init: {},
      header: new Headers(),
      message: new Int32Value({ value: 123 })
    }
  }

  function makeRes(req: UnaryRequest<Int32Value, StringValue>) {
    return <UnaryResponse<Int32Value, StringValue>>{
      stream: false,
      service: TestService,
      method: TestService.methods.unary,
      header: new Headers(),
      message: new StringValue({ value: req.message.value.toString(10) }),
      trailer: new Headers()
    }
  }
  it('should return the response', async function () {
    const res = await runUnaryCall<Int32Value, StringValue>({
      timeoutMs: undefined,
      signal: undefined,
      interceptors: [],
      req: makeReq(),
      async next(req) {
        await new Promise((resolve) => setTimeout(resolve, 1))
        return makeRes(req)
      }
    })
    expect(res.message.value).toBe('123')
  })
  it('should trigger the signal when done', async function () {
    let signal: AbortSignal | undefined
    await runUnaryCall<Int32Value, StringValue>({
      req: makeReq(),
      async next(req) {
        signal = req.signal
        await new Promise((resolve) => setTimeout(resolve, 1))
        return makeRes(req)
      }
    })
    expect(signal?.aborted).toBeTrue()
  })
  it('should raise Code.Canceled on user abort', async function () {
    const userAbort = new AbortController()
    const resPromise = runUnaryCall<Int32Value, StringValue>({
      signal: userAbort.signal,
      req: makeReq(),
      async next(req) {
        for (;;) {
          await new Promise((resolve) => setTimeout(resolve, 1))
          req.signal.throwIfAborted()
        }
      }
    })
    userAbort.abort()
    await expectAsync(resPromise).toBeRejectedWithError(
      '[canceled] This operation was aborted'
    )
  })
  it('should raise Code.DeadlineExceeded on timeout', async function () {
    const resPromise = runUnaryCall<Int32Value, StringValue>({
      timeoutMs: 1,
      req: makeReq(),
      async next(req) {
        for (;;) {
          await new Promise((resolve) => setTimeout(resolve, 1))
          req.signal.throwIfAborted()
        }
      }
    })
    await expectAsync(resPromise).toBeRejectedWithError(
      '[deadline_exceeded] the operation timed out'
    )
  })
})

describe('runStreamingCall()', function () {
  function makeReq() {
    return {
      stream: true as const,
      service: TestService,
      method: TestService.methods.serverStreaming,
      url: `https://example.com/TestService/ServerStreaming`,
      init: {},
      header: new Headers(),
      message: createAsyncIterable([new Int32Value({ value: 123 })])
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function makeRes(req: StreamRequest<Int32Value, StringValue>) {
    return <StreamResponse<Int32Value, StringValue>>{
      stream: true,
      service: TestService,
      method: TestService.methods.serverStreaming,
      header: new Headers(),
      message: createAsyncIterable([
        new StringValue({ value: '1' }),
        new StringValue({ value: '2' }),
        new StringValue({ value: '3' })
      ]),
      trailer: new Headers()
    }
  }

  it('should return the response', async function () {
    const res = await runStreamingCall<Int32Value, StringValue>({
      timeoutMs: undefined,
      signal: undefined,
      interceptors: [],
      req: makeReq(),
      async next(req) {
        await new Promise((resolve) => setTimeout(resolve, 1))
        return makeRes(req)
      }
    })
    const values: string[] = []
    for await (const m of res.message) {
      values.push(m.value)
    }
    expect(values).toEqual(['1', '2', '3'])
  })
  it('should trigger the signal when done', async function () {
    let signal: AbortSignal | undefined
    const res = await runStreamingCall<Int32Value, StringValue>({
      req: makeReq(),
      async next(req) {
        signal = req.signal
        await new Promise((resolve) => setTimeout(resolve, 1))
        return makeRes(req)
      }
    })
    for await (const m of res.message) {
      expect(m).toBeDefined()
    }
    expect(signal?.aborted).toBeTrue()
  })
  it('should raise Code.Canceled on user abort', async function () {
    const userAbort = new AbortController()
    const resPromise = runStreamingCall<Int32Value, StringValue>({
      signal: userAbort.signal,
      req: makeReq(),
      async next(req) {
        for (;;) {
          await new Promise((resolve) => setTimeout(resolve, 1))
          req.signal.throwIfAborted()
        }
      }
    })
    userAbort.abort()
    await expectAsync(resPromise).toBeRejectedWithError(
      '[canceled] This operation was aborted'
    )
  })
  it('should raise Code.DeadlineExceeded on timeout', async function () {
    const resPromise = runStreamingCall<Int32Value, StringValue>({
      timeoutMs: 1,
      req: makeReq(),
      async next(req) {
        for (;;) {
          await new Promise((resolve) => setTimeout(resolve, 1))
          req.signal.throwIfAborted()
        }
      }
    })
    await expectAsync(resPromise).toBeRejectedWithError(
      '[deadline_exceeded] the operation timed out'
    )
  })
})

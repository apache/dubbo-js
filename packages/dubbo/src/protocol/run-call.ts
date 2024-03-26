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

import type { AnyMessage, Message } from '@bufbuild/protobuf'
import type {
  Interceptor,
  StreamRequest,
  StreamResponse,
  UnaryRequest,
  UnaryResponse
} from '../interceptor.js'
import { DubboError } from '../dubbo-error.js'
import {
  createDeadlineSignal,
  createLinkedAbortController,
  getAbortSignalReason
} from './signals.js'

/**
 * UnaryFn represents the client-side invocation of a unary RPC - a method
 * that takes a single input message, and responds with a single output
 * message.
 * A Transport implements such a function, and makes it available to
 * interceptors.
 */
type UnaryFn<
  I extends Message<I> = AnyMessage,
  O extends Message<O> = AnyMessage
> = (req: UnaryRequest<I, O>) => Promise<UnaryResponse<I, O>>

/**
 * Runs a unary method with the given interceptors. Note that this function
 * is only used when implementing a Transport.
 */
export function runUnaryCall<I extends Message<I>, O extends Message<O>>(opt: {
  req: Omit<UnaryRequest<I, O>, 'signal'>
  next: UnaryFn<I, O>
  timeoutMs?: number
  signal?: AbortSignal
  interceptors?: Interceptor[]
}): Promise<UnaryResponse<I, O>> {
  const next = applyInterceptors(opt.next, opt.interceptors)
  const [signal, abort, done] = setupSignal(opt)
  const req = {
    ...opt.req,
    signal
  }
  return next(req).then((res) => {
    done()
    return res
  }, abort)
}

/**
 * StreamingFn represents the client-side invocation of a streaming RPC - a
 * method that takes zero or more input messages, and responds with zero or
 * more output messages.
 * A Transport implements such a function, and makes it available to
 * interceptors.
 */
type StreamingFn<
  I extends Message<I> = AnyMessage,
  O extends Message<O> = AnyMessage
> = (req: StreamRequest<I, O>) => Promise<StreamResponse<I, O>>

/**
 * Runs a server-streaming method with the given interceptors. Note that this
 * function is only used when implementing a Transport.
 */
export function runStreamingCall<
  I extends Message<I>,
  O extends Message<O>
>(opt: {
  req: Omit<StreamRequest<I, O>, 'signal'>
  next: StreamingFn<I, O>
  timeoutMs?: number
  signal?: AbortSignal
  interceptors?: Interceptor[]
}): Promise<StreamResponse<I, O>> {
  const next = applyInterceptors(opt.next, opt.interceptors)
  const [signal, abort, done] = setupSignal(opt)
  const req = {
    ...opt.req,
    signal
  }
  return next(req).then((res) => {
    return {
      ...res,
      message: {
        [Symbol.asyncIterator]() {
          const it = res.message[Symbol.asyncIterator]()
          const w: AsyncIterator<O> = {
            next() {
              return it.next().then((r) => {
                if (r.done == true) {
                  done()
                }
                return r
              }, abort)
            }
          }
          if (it.throw !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- can't handle mutated object sensibly
            w.throw = (e: unknown) => it.throw!(e)
          }
          if (it.return !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion,@typescript-eslint/no-explicit-any -- can't handle mutated object sensibly
            w.return = (value?: any) => it.return!(value)
          }
          return w
        }
      }
    }
  }, abort)
}

/**
 * Create an AbortSignal for Transport implementations. The signal is available
 * in UnaryRequest and StreamingRequest, and is triggered when the call is
 * aborted (via a timeout or explicit cancellation), errored (e.g. when reading
 * an error from the server from the wire), or finished successfully.
 *
 * Transport implementations can pass the signal to HTTP clients to ensure that
 * there are no unused connections leak.
 *
 * Returns a tuple:
 * [0]: The signal, which is also aborted if the optional deadline is reached.
 * [1]: Function to call if the Transport encountered an error.
 * [2]: Function to call if the Transport finished without an error.
 */
function setupSignal(opt: {
  timeoutMs?: number
  signal?: AbortSignal
}): [AbortSignal, (reason: unknown) => Promise<never>, () => void] {
  const { signal, cleanup } = createDeadlineSignal(opt.timeoutMs)
  const controller = createLinkedAbortController(opt.signal, signal)
  return [
    controller.signal,
    function abort(reason: unknown): Promise<never> {
      // We peek at the deadline signal because fetch() will throw an error on
      // abort that discards the signal reason.
      const e = DubboError.from(
        signal.aborted ? getAbortSignalReason(signal) : reason
      )
      controller.abort(e)
      cleanup()
      return Promise.reject(e)
    },
    function done() {
      cleanup()
      controller.abort()
    }
  ]
}

/**
 * applyInterceptors takes the given UnaryFn or ServerStreamingFn, and wraps
 * it with each of the given interceptors, returning a new UnaryFn or
 * ServerStreamingFn.
 */
function applyInterceptors<T>(
  next: T,
  interceptors: Interceptor[] | undefined
): T {
  return (
    (interceptors
      ?.concat()
      .reverse()
      .reduce(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        (n, i) => i(n),
        next as any // eslint-disable-line @typescript-eslint/no-explicit-any
      ) as T) ?? next
  )
}

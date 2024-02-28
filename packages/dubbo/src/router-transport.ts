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

import { createTransport } from './protocol-triple/transport.js'
import type { CommonTransportOptions } from './protocol/transport-options.js'
import { createUniversalHandlerClient } from './protocol/universal-handler-client.js'
import { createDubboRouter } from './router.js'
import type { DubboRouter, DubboRouterOptions } from './router.js'

/**
 * Creates a Transport that routes requests to the configured router. Useful for testing
 * and calling services running in the same process.
 *
 * This can be used to test both client logic by using this to stub/mock the backend,
 * and to test server logic by using this to run without needing to spin up a server.
 *
 * Mainly used for testing of dubbo-node-test and dubbo-web-test
 */
export function createRouterTransport(
  routes: (router: DubboRouter) => void,
  options?: {
    transport?: Partial<CommonTransportOptions>
    router?: DubboRouterOptions
  }
) {
  const router = createDubboRouter({
    ...(options?.router ?? {}),
    triple: true
  })
  routes(router)
  return createTransport({
    httpClient: createUniversalHandlerClient(router.handlers),
    baseUrl: 'https://in-memory',
    useBinaryFormat: true,
    interceptors: [],
    acceptCompression: [],
    sendCompression: null,
    compressMinBytes: Number.MAX_SAFE_INTEGER,
    readMaxBytes: Number.MAX_SAFE_INTEGER,
    writeMaxBytes: Number.MAX_SAFE_INTEGER,
    ...(options?.transport ?? {})
  })
}

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

import type { JsonValue } from '@bufbuild/protobuf'
import { createDubboRouter, Code, DubboError } from '@apachedubbo/dubbo'
import type { DubboRouter, DubboRouterOptions } from '@apachedubbo/dubbo'
import type { UniversalHandler } from '@apachedubbo/dubbo/protocol'
import type { ExpandHandler } from '@apachedubbo/dubbo/protocol-triple'
import {
  compressionBrotli,
  compressionGzip,
  universalRequestFromNodeRequest,
  universalResponseToNodeResponse
} from '@apachedubbo/dubbo-node'
import type * as express from 'express'

interface ExpressDubboMiddlewareOptions extends DubboRouterOptions {
  /**
   * Route definitions. We recommend the following pattern:
   *
   * Create a file `connect.ts` with a default export such as this:
   *
   * ```ts
   * import {DubboRouter} from "@apachedubbo/dubbo";
   *
   * export default (router: DubboRouter) => {
   *   router.service(ElizaService, {});
   * }
   * ```
   *
   * Then pass this function here.
   */
  routes: (router: DubboRouter) => void

  /**
   * Serve all handlers under this prefix. For example, the prefix "/something"
   * will serve the RPC foo.FooService/Bar under "/something/foo.FooService/Bar".
   * Note that many gRPC client implementations do not allow for prefixes.
   */
  requestPathPrefix?: string
}

/**
 * Adds your Dubbo RPCs to an Express server.
 */
export function expressDubboMiddleware(
  options: ExpressDubboMiddlewareOptions
): express.Handler {
  if (options.acceptCompression === undefined) {
    options.acceptCompression = [compressionGzip, compressionBrotli]
  }
  const router = createDubboRouter(options)
  options.routes(router)
  const prefix = options.requestPathPrefix ?? ''
  const paths = new Map<string, UniversalHandler & ExpandHandler>()
  for (const uHandler of router.handlers) {
    paths.set(
      prefix +
        uHandler.requestPath +
        uHandler.serviceVersion +
        uHandler.serviceGroup,
      uHandler
    )
  }
  return function handler(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    // Strip the query parameter when matching paths.
    const uHandler = paths.get(
      (req.url?.split('?', 2)[0] ?? '') +
        (req.headers['tri-service-version'] ?? '') +
        (req.headers['tri-service-group'] ?? '')
    )
    if (!uHandler) {
      return next()
    }
    const uReq = universalRequestFromNodeRequest(req, getPreparsedBody(req))
    uHandler(uReq)
      .then((uRes) => universalResponseToNodeResponse(uRes, res))
      .catch((reason) => {
        if (DubboError.from(reason).code == Code.Aborted) {
          return
        }
        // eslint-disable-next-line no-console
        console.error(
          `handler for rpc ${uHandler.method.name} of ${uHandler.service.typeName} failed`,
          reason
        )
      })
  }
}

/**
 * Get a pre-parsed JSON value from the request object, or undefined if
 * there is none.
 *
 * This supports the very popular npm package "body-parser", which reads the
 * body of an incoming request, parses it as JSON if the Content-Type header
 * _ends_ with "json", and stores in on the request object in the "body"
 * property.
 *
 * The recommended way to use body-parser is to add it to specific routes
 * instead of globally, but we have no control over this.
 */
function getPreparsedBody(req: express.Request): JsonValue | undefined {
  // We intentionally treat null as not set.
  if (req.body === null || req.body === undefined) {
    return undefined
  }
  return req.body as JsonValue
}

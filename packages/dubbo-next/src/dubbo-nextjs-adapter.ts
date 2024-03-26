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

import { createDubboRouter } from '@apachedubbo/dubbo'
import type { DubboRouter, DubboRouterOptions } from '@apachedubbo/dubbo'
import type { UniversalHandler } from '@apachedubbo/dubbo/protocol'
import type { ExpandHandler } from '@apachedubbo/dubbo/protocol-triple'
import {
  compressionBrotli,
  compressionGzip,
  universalRequestFromNodeRequest,
  universalResponseToNodeResponse
} from '@apachedubbo/dubbo-node'
import type { NextApiRequest, NextApiResponse, PageConfig } from 'next'
import type { JsonValue } from '@bufbuild/protobuf'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NextApiHandler<T = any> = (
  req: NextApiRequest,
  res: NextApiResponse<T>
) => unknown | Promise<unknown>

interface NextJsApiRouterOptions extends DubboRouterOptions {
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
   *
   * This is `/api` by default for Next.js.
   */
  prefix?: string
}

/**
 * Provide your Dubbo RPCs via Next.js API routes.
 */
export function nextJsApiRouter(options: NextJsApiRouterOptions): ApiRoute {
  if (options.acceptCompression === undefined) {
    options.acceptCompression = [compressionGzip, compressionBrotli]
  }
  const router = createDubboRouter(options)
  options.routes(router)
  const prefix = options.prefix ?? '/api'
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

  async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Strip the query parameter when matching paths.
    const requestPath = req.url?.split('?', 2)[0] ?? ''
    const uHandler = paths.get(
      requestPath +
        (req.headers['tri-service-version'] ?? '') +
        (req.headers['tri-service-group'] ?? '')
    )
    if (!uHandler) {
      res.writeHead(404)
      res.end()
      return
    }
    try {
      const uRes = await uHandler(
        universalRequestFromNodeRequest(req, req.body as JsonValue | undefined)
      )
      await universalResponseToNodeResponse(uRes, res)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(
        `handler for rpc ${uHandler.method.name} of ${uHandler.service.typeName} failed`,
        e
      )
    }
  }

  return {
    handler,
    config: {
      api: {
        bodyParser: false
      }
    }
  }
}

interface ApiRoute {
  handler: NextApiHandler
  config: PageConfig
}

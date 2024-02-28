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
import { Code, DubboError, createDubboRouter } from '@apachedubbo/dubbo'
import type { DubboRouter, DubboRouterOptions } from '@apachedubbo/dubbo'
import * as protoTriple from '@apachedubbo/dubbo/protocol-triple'
import * as protoGrpcWeb from '@apachedubbo/dubbo/protocol-grpc-web'
import * as protoGrpc from '@apachedubbo/dubbo/protocol-grpc'
import type { UniversalHandler } from '@apachedubbo/dubbo/protocol'
import type { ExpandHandler } from '@apachedubbo/dubbo/protocol-triple'
import {
  compressionBrotli,
  compressionGzip,
  universalRequestFromNodeRequest,
  universalResponseToNodeResponse
} from '@apachedubbo/dubbo-node'
import type { FastifyInstance } from 'fastify/types/instance'

interface FastifyDubboPluginOptions extends DubboRouterOptions {
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
  routes?: (router: DubboRouter) => void
}

/**
 * Plug your Dubbo routes into a Fastify server.
 */
export function fastifyDubboPlugin(
  instance: FastifyInstance,
  opts: FastifyDubboPluginOptions,
  done: (err?: Error) => void
) {
  if (opts.routes === undefined) {
    done()
    return
  }
  if (opts.acceptCompression === undefined) {
    opts.acceptCompression = [compressionGzip, compressionBrotli]
  }
  const router = createDubboRouter(opts)
  opts.routes(router)

  const uHandlers = router.handlers
  if (uHandlers.length == 0) {
    done()
    return
  }

  // we can override all content type parsers (including application/json) in
  // this plugin without affecting outer scope
  addNoopContentTypeParsers(instance)

  const paths = new Map<string, Map<string, UniversalHandler & ExpandHandler>>()

  for (const uHandler of router.handlers) {
    let handlersMap = paths.get(uHandler.requestPath)
    if (!handlersMap) {
      handlersMap = new Map()
      paths.set(uHandler.requestPath, handlersMap)
    }
    handlersMap.set(uHandler.serviceVersion + uHandler.serviceGroup, uHandler)
  }

  for (const [requestPath, handlersMap] of paths) {
    instance.all(
      requestPath,
      {},
      async function handleFastifyRequest(req, reply) {
        const uHandler = handlersMap.get(
          (((req.headers['tri-service-version'] ?? '') as string) +
            (req.headers['tri-service-group'] ?? '')) as string
        )
        if (!uHandler) {
          reply
            .status(404)
            .send({ status: Code.Unimplemented, message: 'HTTP 404' })
          return
        }
        try {
          const uRes = await uHandler(
            universalRequestFromNodeRequest(
              req.raw,
              req.body as JsonValue | undefined
            )
          )
          // Fastify maintains response headers on the reply object and only moves them to
          // the raw response during reply.send, but we are not using reply.send with this plugin.
          // So we need to manually copy them to the raw response before handing off to vanilla Node.
          for (const [key, value] of Object.entries(reply.getHeaders())) {
            if (value !== undefined) {
              reply.raw.setHeader(key, value)
            }
          }
          await universalResponseToNodeResponse(uRes, reply.raw)
        } catch (e) {
          if (DubboError.from(e).code == Code.Aborted) {
            return
          }
          // eslint-disable-next-line no-console
          console.error(
            `handler for rpc ${uHandler.method.name} of ${uHandler.service.typeName} failed`,
            e
          )
        }
      }
    )
  }

  done()
}

/**
 * Registers fastify content type parsers that do nothing for all content-types
 * known to Connect.
 */
function addNoopContentTypeParsers(instance: FastifyInstance): void {
  instance.addContentTypeParser(
    [
      protoTriple.contentTypeUnaryJson,
      protoTriple.contentTypeStreamJson,
      protoGrpcWeb.contentTypeProto,
      protoGrpcWeb.contentTypeJson,
      protoGrpc.contentTypeProto,
      protoGrpc.contentTypeJson
    ],
    noopContentTypeParser
  )
  instance.addContentTypeParser(
    protoGrpc.contentTypeRegExp,
    noopContentTypeParser
  )
  instance.addContentTypeParser(
    protoGrpcWeb.contentTypeRegExp,
    noopContentTypeParser
  )
  instance.addContentTypeParser(
    protoTriple.contentTypeRegExp,
    noopContentTypeParser
  )
}

function noopContentTypeParser(
  _req: unknown,
  _payload: unknown,
  done: (err: null, body?: undefined) => void
) {
  done(null, undefined)
}

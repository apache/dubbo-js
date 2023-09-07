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

import { Code, DubboError, createDubboRouter } from "@apachedubbo/dubbo";
import type { DubboRouter, DubboRouterOptions } from "@apachedubbo/dubbo";
import type { UniversalHandler } from "@apachedubbo/dubbo/protocol";
import type { ExpandHandler } from "@apachedubbo/dubbo/protocol-triple";
import { uResponseNotFound } from "@apachedubbo/dubbo/protocol";
import {
  universalRequestFromNodeRequest,
  universalResponseToNodeResponse,
} from "./node-universal-handler.js";
import type {
  NodeHandlerFn,
  NodeServerRequest,
  NodeServerResponse,
} from "./node-universal-handler.js";
import { compressionBrotli, compressionGzip } from "./compression.js";

interface DubboNodeAdapterOptions extends DubboRouterOptions {
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
  routes: (router: DubboRouter) => void;
  /**
   * If none of the handler request paths match, a 404 is served. This option
   * can provide a custom fallback for this case.
   */
  fallback?: NodeHandlerFn;
  /**
   * Serve all handlers under this prefix. For example, the prefix "/something"
   * will serve the RPC foo.FooService/Bar under "/something/foo.FooService/Bar".
   * Note that many gRPC client implementations do not allow for prefixes.
   */
  requestPathPrefix?: string;
}

/**
 * Create a Node.js request handler from a DubboRouter.
 *
 * The returned function is compatible with http.RequestListener and its equivalent for http2.
 */
export function dubboNodeAdapter(
  options: DubboNodeAdapterOptions
): NodeHandlerFn {
  if (options.acceptCompression === undefined) {
    options.acceptCompression = [compressionGzip, compressionBrotli];
  }
  const router = createDubboRouter(options);
  options.routes(router);
  const prefix = options.requestPathPrefix ?? "";
  const paths = new Map<string, UniversalHandler & ExpandHandler>();
  for (const uHandler of router.handlers) {
    paths.set(prefix + uHandler.requestPath + uHandler.serviceVersion + uHandler.serviceGroup, uHandler);
  }
  return function nodeRequestHandler(
    req: NodeServerRequest,
    res: NodeServerResponse
  ): void {
    // Strip the query parameter when matching paths.
    const uHandler = paths.get((req.url?.split("?", 2)[0] ?? "") + (req.headers['tri-service-version'] ?? "") + (req.headers['tri-service-group'] ?? ""));
    if (!uHandler) {
      (options.fallback ?? fallback)(req, res);
      return;
    }
    const uReq = universalRequestFromNodeRequest(req, undefined);
    uHandler(uReq)
      .then((uRes) => universalResponseToNodeResponse(uRes, res))
      .catch((reason) => {
        if (DubboError.from(reason).code == Code.Aborted) {
          return;
        }
        // eslint-disable-next-line no-console
        console.error(
          `handler for rpc ${uHandler.method.name} of ${uHandler.service.typeName} failed`,
          reason
        );
      });
  };
}

const fallback: NodeHandlerFn = (request, response) => {
  response.writeHead(uResponseNotFound.status);
  response.end();
};

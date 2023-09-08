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

import { createPromiseClient } from "@apachedubbo/dubbo";
import { TestService } from "../gen/grpc/testing/test_dubbo.js";
import { PayloadType } from "../gen/grpc/testing/messages_pb.js";
import { createTestServers } from "../helpers/testserver.js";
import { interop } from "../helpers/interop.js";

describe("ping_pong", () => {
  const sizes = [31415, 9, 2653, 58979];
  const servers = createTestServers();
  beforeAll(async () => await servers.start());

  servers.describeTransportsExcluding(
    // All following Transports run over HTTP/1, which cannot support full-duplex.
    [
      "@apachedubbo/dubbo-node (Triple, JSON, http) against @apachedubbo/dubbo-node (h1)",
      "@apachedubbo/dubbo-node (Triple, binary, http) against @apachedubbo/dubbo-node (h1)",
      "@apachedubbo/dubbo-node (Triple, binary, https) against @apachedubbo/dubbo-node (h1 + tls)",
      "@apachedubbo/dubbo-node (Triple, JSON, https) against @apachedubbo/dubbo-node (h1 + tls)",
      "@apachedubbo/dubbo-node (Triple, JSON, http, gzip) against @apachedubbo/dubbo-node (h1)",
      "@apachedubbo/dubbo-node (Triple, binary, http, gzip) against @apachedubbo/dubbo-node (h1)",
      "@apachedubbo/dubbo-node (Triple, JSON, http, gzip) against @apachedubbo/dubbo-express (h1)",
      "@apachedubbo/dubbo-node (Triple, binary, http, gzip) against @apachedubbo/dubbo-express (h1)",
      "@apachedubbo/dubbo-node (gRPC, binary, http) against @apachedubbo/dubbo-node (h1)",
      "@apachedubbo/dubbo-node (gRPC, JSON, http) against @apachedubbo/dubbo-node (h1)",
      "@apachedubbo/dubbo-node (gRPC, JSON, https) against @apachedubbo/dubbo-node (h1 + tls)",
      "@apachedubbo/dubbo-node (gRPC, binary, https) against @apachedubbo/dubbo-node (h1 + tls)",
      "@apachedubbo/dubbo-node (gRPC, JSON, http, gzip) against @apachedubbo/dubbo-node (h1)",
      "@apachedubbo/dubbo-node (gRPC, binary, http, gzip) against @apachedubbo/dubbo-node (h1)",
      "@apachedubbo/dubbo-node (gRPC, JSON, http, gzip) against @apachedubbo/dubbo-express (h1)",
      "@apachedubbo/dubbo-node (gRPC, binary, http, gzip) against @apachedubbo/dubbo-express (h1)",
      "@apachedubbo/dubbo-node (gRPC-web, binary, http) against @apachedubbo/dubbo-node (h1)",
      "@apachedubbo/dubbo-node (gRPC-web, JSON, http) against @apachedubbo/dubbo-node (h1)",
      "@apachedubbo/dubbo-node (gRPC-web, JSON, https) against @apachedubbo/dubbo-node (h1 + tls)",
      "@apachedubbo/dubbo-node (gRPC-web, binary, https) against @apachedubbo/dubbo-node (h1 + tls)",
      "@apachedubbo/dubbo-node (gRPC-web, JSON, http, gzip) against @apachedubbo/dubbo-node (h1)",
      "@apachedubbo/dubbo-node (gRPC-web, binary, http, gzip) against @apachedubbo/dubbo-node (h1)",
      "@apachedubbo/dubbo-node (gRPC-web, JSON, http, gzip) against @apachedubbo/dubbo-express (h1)",
      "@apachedubbo/dubbo-node (gRPC-web, binary, http, gzip) against @apachedubbo/dubbo-express (h1)",
    ],
    (transport) => {
      it("with promise client", async function () {
        const client = createPromiseClient(TestService, transport());

        // eslint-disable-next-line @typescript-eslint/require-await
        async function* input() {
          for (const size of sizes) {
            yield {
              payload: interop.makeServerPayload(
                PayloadType.COMPRESSABLE,
                size
              ),
              responseParameters: [
                {
                  size,
                  intervalUs: 0,
                },
              ],
            };
          }
        }
        let i = 0;
        for await (const res of client.fullDuplexCall(input())) {
          const size = sizes[i];
          expect(res.payload?.body.length).toBe(size);
          expect(res.payload?.type).toBe(PayloadType.COMPRESSABLE);
          i++;
        }
        expect(i).toBe(sizes.length);
      });
    }
  );

  afterAll(async () => await servers.stop());
});

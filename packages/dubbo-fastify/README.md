# @apachedubbo/dubbo-fastify

Dubbo is a family of libraries for building and consuming APIs on different languages and platforms, and
[@apachedubbo/dubbo](https://www.npmjs.com/package/@apachedubbo/dubbo) brings type-safe APIs with Protobuf to
TypeScript.

`@apachedubbo/dubbo-fastify` provides a plugin for [fastify](https://www.fastify.io/), the fast and 
low overhead web framework, for Node.js.

### fastifyDubboPlugin()

Plug your Dubbo RPCs into a fastify server.

```ts
// connect.ts
import { DubboRouter } from "@apachedubbo/dubbo";

export default function(router: DubboRouter) {
  // implement rpc Say(SayRequest) returns (SayResponse)
  router.rpc(ElizaService, ElizaService.methods.say, async (req) => ({
    sentence: `you said: ${req.sentence}`,
  }));
}
```

```diff
// server.ts
import { fastify } from "fastify";
+ import routes from "dubbo";
+ import { fastifyDubboPlugin } from "@apachedubbo/dubbo-fastify";

const server = fastify({
  http2: true,
});

+ await server.register(fastifyDubboPlugin, { 
+  routes 
+ });

await server.listen({
  host: "localhost",
  port: 8080,
});
```

With that server running, you can make requests with any gRPC, gRPC-Web, or Dubbo client.

`buf curl` with the gRPC protocol:

```bash
buf curl --schema buf.build/bufbuild/eliza \
  --protocol grpc --http2-prior-knowledge \
  -d '{"sentence": "I feel happy."}' \
  http://localhost:8080/buf.connect.demo.eliza.v1.ElizaService/Say
```

`curl` with the Dubbo protocol:

```bash
curl \
    --header "Content-Type: application/json" \
    --data '{"sentence": "I feel happy."}' \
    --http2-prior-knowledge \
    http://localhost:8080/buf.connect.demo.eliza.v1.ElizaService/Say
```

Node.js with the gRPC protocol (using a transport from [@apachedubbo/dubbo-node](https://www.npmjs.com/package/@apachedubbo/dubbo-node)):

```ts
import { createPromiseClient } from "@apachedubbo/dubbo";
import { createGrpcTransport } from "@apachedubbo/dubbo-node";
import { ElizaService } from "./gen/eliza_dubbo.js";

const transport = createGrpcTransport({
  baseUrl: "http://localhost:8080",
  httpVersion: "2",
});

const client = createPromiseClient(ElizaService, transport);
const { sentence } = await client.say({ sentence: "I feel happy." });
console.log(sentence) // you said: I feel happy.
```

A client for the web browser actually looks identical to this example - it would
simply use `createDubboTransport` from [@apachedubbo/dubbo-web](https://www.npmjs.com/package/@apachedubbo/dubbo-web) 
instead.


## Getting started

To get started with Dubbo, head over to the [docs](https://cn.dubbo.apache.org/zh-cn/overview/quickstart/)
for a tutorial, or take a look at [our example](https://github.com/apache/dubbo-js/tree/dubbo3/example/). 

# apache-dubbo-express

Dubbo is a family of libraries for building and consuming APIs on different languages and platforms, and
[apache-dubbo](https://www.npmjs.com/package/apache-dubbo) brings type-safe APIs with Protobuf to
TypeScript.

`apache-dubbo-express` provides a middleware for [Express](https://expressjs.com/), the fast, 
unopinionated, minimalist web framework for Node.js

### expressConnectMiddleware()

Adds your Dubbo RPCs to an Express server.

```ts
// connect.ts
import { DubboRouter } from "apache-dubbo";

export default function(router: DubboRouter) {
  // implement rpc Say(SayRequest) returns (SayResponse)
  router.rpc(ElizaService, ElizaService.methods.say, async (req) => ({
    sentence: `you said: ${req.sentence}`,
  }));
}
```

```diff
// server.ts
import http from "http";
import express from "express";
+ import routes from "dubbo";
+ import { expressConnectMiddleware } from "apache-dubbo-express";

const app = express();

+ app.use(expressConnectMiddleware({ 
+  routes 
+ }));

http.createServer(app).listen(8080);
```

With that server running, you can make requests with any gRPC-web or Dubbo client.

`curl` with the Dubbo protocol:

```bash
curl \
    --header "Content-Type: application/json" \
    --data '{"sentence": "I feel happy."}' \
    http://localhost:8080/buf.connect.demo.eliza.v1.ElizaService/Say
```

Node.js with the gRPC-web protocol (using a transport from [apache-dubbo-node](https://www.npmjs.com/package/apache-dubbo-node)):

```ts
import { createPromiseClient } from "apache-dubbo";
import { createGrpcWebTransport } from "apache-dubbo-node";
import { ElizaService } from "./gen/eliza_dubbo.js";

const transport = createGrpcWebTransport({
  baseUrl: "http://localhost:8080",
  httpVersion: "1.1",
});

const client = createPromiseClient(ElizaService, transport);
const { sentence } = await client.say({ sentence: "I feel happy." });
console.log(sentence) // you said: I feel happy.
```

A client for the web browser actually looks identical to this example - it would
simply use `createDubboTransport` from [apache-dubbo-web](https://www.npmjs.com/package/apache-dubbo-web) 
instead.

Note that support for gRPC is limited, since many gRPC clients require HTTP/2, 
and Express does not support the Node.js `http2` module.


## Getting started

To get started with Dubbo, head over to the [docs](https://cn.dubbo.apache.org/zh-cn/overview/quickstart/)
for a tutorial, or take a look at [our example](https://github.com/apache/dubbo-js/tree/dubbo3/example/). 

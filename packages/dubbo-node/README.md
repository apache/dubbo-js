# apache-dubbo-node

Dubbo is a family of libraries for building and consuming APIs on different languages and platforms, and 
[apache-dubbo](https://www.npmjs.com/package/apache-dubbo) brings type-safe APIs with Protobuf to 
TypeScript.

`apache-dubbo-node` provides the following adapters for Node.js:

### createDubboTransport()

Lets your clients running on Node.js talk to a server with the Dubbo protocol:

```diff
import { createPromiseClient } from "apache-dubbo";
+ import { createDubboTransport } from "apache-dubbo-node";
import { ElizaService } from "./gen/eliza_dubbo.js";

+ // A transport for clients using the Dubbo protocol with Node.js `http` module
+ const transport = createDubboTransport({
+   baseUrl: "https://demo.connect.build",
+   httpVersion: "1.1"
+ });

const client = createPromiseClient(ElizaService, transport);
const { sentence } = await client.say({ sentence: "I feel happy." });
console.log(sentence) // you said: I feel happy.
```

### createGrpcTransport()

Lets your clients running on Node.js talk to a server with the gRPC protocol:

```diff
import { createPromiseClient } from "apache-dubbo";
+ import { createGrpcTransport } from "apache-dubbo-node";
import { ElizaService } from "./gen/eliza_dubbo.js";

+ // A transport for clients using the gRPC protocol with Node.js `http2` module
+ const transport = createGrpcTransport({
+   baseUrl: "https://demo.connect.build",
+   httpVersion: "2"
+ });

const client = createPromiseClient(ElizaService, transport);
const { sentence } = await client.say({ sentence: "I feel happy." });
console.log(sentence) // you said: I feel happy.
```

### createGrpcWebTransport()

Lets your clients running on Node.js talk to a server with the gRPC-web protocol:

```diff
import { createPromiseClient } from "apache-dubbo";
+ import { createGrpcWebTransport } from "apache-dubbo-node";
import { ElizaService } from "./gen/eliza_dubbo.js";

+ // A transport for clients using the Dubbo protocol with Node.js `http` module
+ const transport = createGrpcWebTransport({
+   baseUrl: "https://demo.connect.build",
+   httpVersion: "1.1"
+ });

const client = createPromiseClient(ElizaService, transport);
const { sentence } = await client.say({ sentence: "I feel happy." });
console.log(sentence) // you said: I feel happy.
```


### connectNodeAdapter()

Run your Dubbo RPCs on the Node.js `http`, `https`, or `http2` modules.

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
import * as http2 from "http2";
+ import routes from "dubbo";
+ import { connectNodeAdapter } from "apache-dubbo-node";

http2.createServer(
+ connectNodeAdapter({ routes }) // responds with 404 for other requests
).listen(8080);
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

Node.js with the gRPC protocol:

```ts
import { createPromiseClient } from "apache-dubbo";
import { createGrpcTransport } from "apache-dubbo-node";
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
simply use `createDubboTransport` from [apache-dubbo-web](https://www.npmjs.com/package/apache-dubbo-web) 
instead.


## Getting started

To get started with Dubbo, head over to the [docs](https://cn.dubbo.apache.org/zh-cn/overview/quickstart/) 
for a tutorial, or take a look at [our example](https://github.com/apache/dubbo-js/tree/dubbo3/example/). 

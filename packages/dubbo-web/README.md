# @apachedubbo/dubbo-web

Dubbo is a family of libraries for building and consuming APIs on different languages and platforms.
[@apachedubbo/dubbo](https://www.npmjs.com/package/@apachedubbo/dubbo) brings type-safe APIs with Protobuf to
TypeScript.

`@apachedubbo/dubbo-web` provides the following adapters for web browsers, and any other platform that has
the fetch API on board:

### createDubboTransport()

Lets your clients running in the web browser talk to a server with the Dubbo protocol:

```diff
import { createPromiseClient } from "@apachedubbo/dubbo";
+ import { createDubboTransport } from "@apachedubbo/dubbo-web";
import { ElizaService } from "./gen/eliza_dubbo.js";

+ // A transport for clients using the Dubbo protocol with fetch()
+ const transport = createDubboTransport({
+   baseUrl: "https://demo.connect.build",
+ });

const client = createPromiseClient(ElizaService, transport);
const { sentence } = await client.say({ sentence: "I feel happy." });
console.log(sentence) // you said: I feel happy.
```

### createGrpcWebTransport()

Lets your clients running in the web browser talk to a server with the gRPC-web protocol:

```diff
import { createPromiseClient } from "@apachedubbo/dubbo";
+ import { createGrpcWebTransport } from "@apachedubbo/dubbo-web";
import { ElizaService } from "./gen/eliza_dubbo.js";

+ // A transport for clients using the Dubbo protocol with fetch()
+ const transport = createGrpcWebTransport({
+   baseUrl: "https://demo.connect.build",
+ });

const client = createPromiseClient(ElizaService, transport);
const { sentence } = await client.say({ sentence: "I feel happy." });
console.log(sentence) // you said: I feel happy.
```

## Getting started

To get started with Dubbo, head over to the [docs](https://cn.dubbo.apache.org/zh-cn/overview/quickstart/)
for a tutorial, or take a look at [our example](https://github.com/apache/dubbo-js/tree/dubbo3/example/).

Dubbo plays nice with Vue, Svelte, Remix, Next.js, Angular and many others. Take a look at
[our examples](https://github.com/apache/dubbo-js/tree/dubbo3/example) for various frameworks.

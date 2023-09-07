# @apachedubbo/dubbo-next

Dubbo is a family of libraries for building and consuming APIs on different languages and platforms, and
[@apachedubbo/dubbo](https://www.npmjs.com/package/@apachedubbo/dubbo) brings type-safe APIs with Protobuf to
TypeScript.

`@apachedubbo/dubbo-next` provides a plugin for [Next.js](https://nextjs.org/), 
the React Framework for the Web.


### nextJsApiRouter()

Provide your Dubbo RPCs via Next.js API routes.  To enable Dubbo in Next.js, 
add two files to your project:

```diff
.
├── connect.ts
└── pages
    └── api
        └── [[...connect]].ts
```

`connect.ts` is where you register your RPCs:

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

`pages/api/[[..connect]].ts` is a Next.js [catch-all API route](https://nextjs.org/docs/routing/dynamic-routes#catch-all-routes): 

```ts
// pages/api/[[..connect]].ts
import { nextJsApiRouter } from "@apachedubbo/dubbo-next";
import routes from "../../connect";

const {handler, config} = nextJsApiRouter({ routes });
export {handler as default, config};
```

With that server running, you can make requests with any Dubbo or gRPC-Web client.
Note that Next.js serves all your RPCs with the `/api` prefix.

`curl` with the Dubbo protocol:

```bash
curl \
    --header "Content-Type: application/json" \
    --data '{"sentence": "I feel happy."}' \
    --http2-prior-knowledge \
    http://localhost:3000/api/buf.connect.demo.eliza.v1.ElizaService/Say
```

Node.js with the gRPC-web protocol (using a transport from [@apachedubbo/dubbo-node](https://www.npmjs.com/package/@apachedubbo/dubbo-node)):

```ts
import { createPromiseClient } from "@apachedubbo/dubbo";
import { createGrpcWebTransport } from "@apachedubbo/dubbo-node";
import { ElizaService } from "./gen/eliza_dubbo.js";

const transport = createGrpcWebTransport({
  baseUrl: "http://localhost:3000/api",
  httpVersion: "1.1",
});

const client = createPromiseClient(ElizaService, transport);
const { sentence } = await client.say({ sentence: "I feel happy." });
console.log(sentence) // you said: I feel happy.
```

A client for the web browser actually looks identical to this example - it would
simply use `createDubboTransport` from [@apachedubbo/dubbo-web](https://www.npmjs.com/package/@apachedubbo/dubbo-web)
instead.

Note that support for gRPC is limited, since many gRPC clients require HTTP/2,
and Express does not support the Node.js `http2` module.


### Deploying to Vercel

Currently, `@apachedubbo/dubbo-next` does not support the Vercel Edge runtime.
It requires the Node.js server runtime, which is used by default when deploying
to Vercel.  


## Getting started

To get started with Dubbo, head over to the [docs](https://cn.dubbo.apache.org/zh-cn/overview/quickstart/)
for a tutorial, or take a look at [our example](https://github.com/apache/dubbo-js/tree/dubbo3/example/). 

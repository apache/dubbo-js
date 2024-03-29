# @apachedubbo/dubbo

Dubbo is a family of libraries for building type-safe APIs with different languages and platforms.  
[@apachedubbo/dubbo](https://www.npmjs.com/package/@apachedubbo/dubbo) brings them to TypeScript,
the web browser, and to Node.js.


With Dubbo, you define your schema first:

```
service ElizaService {
  rpc Say(SayRequest) returns (SayResponse) {}
}
```

And with the magic of code generation, this schema produces servers and clients:

```ts
const answer = await eliza.say({sentence: "I feel happy."});
console.log(answer);
// {sentence: 'When you feel happy, what do you do?'}
```

Unlike REST, the RPCs you use with Dubbo are typesafe end to end, but they are
regular HTTP under the hood. You can see all requests in the network inspector,
and you can `curl` them if you want:

```shell
curl \
    --header 'Content-Type: application/json' \
    --data '{"sentence": "I feel happy."}' \
    https://demo.connect.build/buf.connect.demo.eliza.v1.ElizaService/Say
```

With Dubbo for ECMAScript, you can spin up a service in Node.js and call it
from the web, the terminal, or native mobile clients. Under the hood, it uses
[Protocol Buffers](https://github.com/bufbuild/protobuf-es) for the schema, and
implements RPC (remote procedure calls) with three protocols: The widely available
gRPC and gRPC-web, and Dubbo's [own protocol](https://cn.dubbo.apache.org/zh-cn/overview/reference/protocols/triple-spec/),
optimized for the web. This gives you unparalleled interoperability with
full-stack type-safety.


## Get started on the web

Follow our [10 minute tutorial](https://cn.dubbo.apache.org/zh-cn/overview/quickstart/) where
we use [Vite](https://vitejs.dev/) and [React](https://reactjs.org/) to create a
web interface for ELIZA.

**React**, **Svelte**, **Vue**, **Next.js** and **Angular** are supported (see [examples](https://github.com/apache/dubbo-js/tree/dubbo3/example)).
We support all modern web browsers that implement the widely available
[fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
and the [Encoding API](https://developer.mozilla.org/en-US/docs/Web/API/Encoding_API).


## Get started on Node.js

Follow our [10 minute tutorial](https://cn.dubbo.apache.org/zh-cn/overview/quickstart/)
to spin up a service in Node.js, and call it from the web, and from a gRPC client
in your terminal.

You can use vanilla Node.js, or our server plugins for [Fastify](https://www.fastify.io/)
or [Express](https://expressjs.com/). We support the builtin `http`, and `http2`
modules on Node.js v16 and later.

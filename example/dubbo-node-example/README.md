# Node RPC

[前置条件](#precondition)

[定义服务](#defineService)

[生成代码](#generateCode)

[实现服务](#implementService)

[启动 Server](#startServer)

[访问服务](#accessService)

[更多内容](#moreContent)

[框架侧待改造](#transform)

基于 Dubbo 定义的 Triple 协议，你可以轻松编写浏览器、gRPC 兼容的 RPC 服务，并让这些服务同时运行在 HTTP/1 和 HTTP/2 上。Dubbo TypeScript SDK 支持使用 IDL 或编程语言特有的方式定义服务，并提供一套轻量的 APl 来发布或调用这些服务。

本示例演示了基于 Triple 协议的 RPC 通信模式，示例使用 Protocol Buffer 定义 RPC 服务，并演示了代码生成、服务发布和服务访问等过程。本示例完整代码请请参见 [xxx](https://aliyuque.antfin.com/__workers/ken.lj/qt1o6i/pw02wty1pin10eia/a)

## <span id="precondition">前置条件</span>

因为使用 Protocol Buffer 的原因，我们首先需要安装相关的代码生成工具，这包括 `@bufbuild/protoc-gen-es`、`@bufbuild/protobuf`、`apache-protoc-gen-dubbo-es`、`apache-dubbo`。

```Shell
npm install @bufbuild/protoc-gen-es @bufbuild/protobuf apache-protoc-gen-dubbo-es apache-dubbo
```

## <span id="defineService">定义服务</span>

现在，使用 Protocol Buffer (IDL) 来定义一个 Dubbo 服务。

创建目录，并生成文件

```Shell
mkdir -p proto && touch proto/example.proto
```

写入内容

```Protobuf
syntax = "proto3";

package apache.dubbo.demo.example.v1;

message SayRequest {
  string sentence = 1;
}

message SayResponse {
  string sentence = 1;
}

service ExampleService {
  rpc Say(SayRequest) returns (SayResponse) {}
}
```

这个文件声明了一个叫做 `ExampleService` 的服务，为这个服务定义了 `Say` 方法以及它的请求参数 `SayRequest` 和返回值 `SayResponse`。

## <span id="generateCode">生成代码</span>

创建 gen 目录，做为生成文件放置的目标目录

```
mkdir -p gen
```

运行以下命令，在 gen 目录下生成代码文件

```Shell
PATH=$PATH:$(pwd)/node_modules/.bin \
  protoc -I proto \
  --es_out gen \
  --es_opt target=ts \
  --dubbo-es_out gen \
  --dubbo-es_opt target=ts \
  example.proto
```

运行命令后，应该可以在目标目录中看到以下生成的文件:

```Plain Text
├── gen
│   ├── example_dubbo.ts
│   └── example_pb.ts
├── proto
│   └── example.proto
```

## <span id="implementService">实现服务</span>

接下来我们就需要添加业务逻辑了，实现 ExampleService ，并将其注册到 DubboRouter 中。

创建 connect.ts 文件

```typescript
import { DubboRouter } from "apache-dubbo";
import { ExampleService } from "./gen/example_dubbo";

export default (router: DubboRouter) =>
  // registers apache.dubbo.demo.example.v1
  router.service(ExampleService, {
    // implements rpc Say
    async say(req) {
      return {
        sentence: `You said: ${req.sentence}`,
      };
    },
  }, { serviceGroup: 'dubbo', serviceVersion: '1.0.0' });
```

## <span id="startServer">启动 Server</span>

Dubbo 服务可以嵌入到普通的 Node.js 服务器、Next.js、Express 或 Fastify 中。
在这里我们将使用 Fastify，所以让我们安装 Fastify 以及我们为 Fastify 准备的插件。

```Shell
npm install fastify apache-dubbo-fastify
```

创建 server.ts 文件，新建一个 Server，把上一步中实现的 `ExampleService` 注册给它。
接下来就可以直接初始化和启动 Server 了，它将在指定的端口接收请求。

```typescript
import { fastify } from "fastify";
import { fastifyConnectPlugin } from "apache-dubbo-fastify";
import routes from "./connect";

async function main() {
  const server = fastify();
  await server.register(fastifyConnectPlugin, {
    routes,
  });
  server.get("/", (_, reply) => {
    reply.type("text/plain");
    reply.send("Hello World!");
  });
  await server.listen({ host: "localhost", port: 8080 });
  console.log("server is listening at", server.addresses());
}

void main();
```

最后，运行代码启动服务

```Shell
npx tsx server.ts
```

## <span id="accessService">访问服务</span>

最简单方式是使用 HTTP/1.1 POST 请求访问服务，参数则作以标准 JSON 格式作为 HTTP 负载传递。如下是使用 cURL 命令的访问示例:

```Shell
curl \
 --header 'Content-Type: application/json' \
 --header 'TRI-Service-Version: 1.0.0' \
 --header 'TRI-Service-group: dubbo' \
 --data '{"sentence": "Hello World"}' \
 http://localhost:8080/apache.dubbo.demo.example.v1.ExampleService/Say
```

也可以使用标准的 Dubbo client 请求服务，我们首先需要从生成代码即 dubbo-node 包中获取服务代理，为它指定 server 地址并初始化，之后就可以发起起 RPC 调用了。

创建 client.ts 文件。

```typescript
import { createPromiseClient } from "apache-dubbo";
import { ExampleService } from "./gen/example_dubbo";
import { createDubboTransport } from "apache-dubbo-node";

const transport = createDubboTransport({
  baseUrl: "http://localhost:8080",
  httpVersion: "1.1",
});

async function main() {
  const client = createPromiseClient(ExampleService, transport, { serviceVersion: '1.0.0', serviceGroup: 'dubbo' });
  const res = await client.say({ sentence: "Hello World" });
  console.log(res);
}
void main();
```

运行客户端

```Shell
npx tsx client.ts
```

## <span id="moreContent">更多内容</span>

- 使用 Dubbo JS 开发微服务
- 更多 Dubbo JS 特性

## <span id="transform">框架侧待改造</span>

- 协议细节还需商讨并修改
- 考虑后续整体生态，增强服务治理能力，添加日志等

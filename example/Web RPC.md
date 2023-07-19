# Web RPC

[前置条件](#precondition)

[定义服务](#defineService)

[生成代码](#generateCode)

[启动 Server](#startServer)

[创建 App](#createApp)

[更多内容](#moreContent)

[框架侧待改造](#transform)

基于 Dubbo 定义的 Triple 协议，你可以轻松编写浏览器、gRPC 兼容的 RPC 服务，并让这些服务同时运行在 HTTP/1 和 HTTP/2 上。Dubbo TypeScript SDK 支持使用 IDL 或编程语言特有的方式定义服务，并提供一套轻量的 APl 来发布或调用这些服务。

本示例演示了基于 Triple 协议的 RPC 通信模式，示例使用 Protocol Buffer 定义 RPC 服务，并演示了代码生成、服务发布和服务访问等过程。本示例完整代码请请参见 [xxx](https://aliyuque.antfin.com/__workers/ken.lj/qt1o6i/pw02wty1pin10eia/a)

## <span id="precondition">前置条件</span>

首先，我们将使用 Vite 配置前端。我们使用 Vite 是为了创建一个快速的开发服务器，它内置了我们稍后需要的所有功能支持

```Shell
npm create vite@latest -- dubbo-web-example --template react-ts
cd dubbo-web-example
npm install
```

因为使用 Protocol Buffer 的原因，我们首先需要安装相关的代码生成工具，这包括 `@bufbuild/protoc-gen-es`、`@bufbuild/protobuf`、`apache-protoc-gen-dubbo-es`、`apache-dubbo`。

```Shell
npm install @bufbuild/protoc-gen-es @bufbuild/protobuf apache-protoc-gen-dubbo-es apache-dubbo
```

## <span id="defineService">定义服务</span>

现在，使用 Protocol Buffer (IDL) 来定义一个 Dubbo 服务。

src 下创建 util/proto 目录，并生成文件

```Shell
mkdir -p src/util/proto && touch src/util/proto/example.proto
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

```Shell
mkdir -p src/util/gen
```

运行以下命令，在 gen 目录下生成代码文件

```Shell
PATH=$PATH:$(pwd)/node_modules/.bin \
  protoc -I src/util/proto \
  --es_out src/util/gen \
  --es_opt target=ts \
  --dubbo-es_out src/util/gen \
  --dubbo-es_opt target=ts \
  example.proto
```

运行命令后，应该可以在目标目录中看到以下生成的文件:

```Plain Text
├── src
│   ├── util
│   │   ├── gen
│   │   │   ├── example_dubbo.ts
│   │   │   └── example_pb.ts
│   │   └── proto
│   │       └── example.proto
```

## <span id="createApp">创建 App</span>

需要先下载 `apache-dubbo-web`

```shell
npm install apache-dubbo-web
```

现在我们可以从包中导入服务并设置一个客户端。在 App.tsx 中添加以下内容：

```typescript
import { useState } from "react";
import "./App.css";

import { createPromiseClient } from "apache-dubbo";
import { createConnectTransport } from "apache-dubbo-web";

// Import service definition that you want to connect to.
import { ExampleService } from "./util/gen/example_dubbo";

// The transport defines what type of endpoint we're hitting.
// In our example we'll be communicating with a Connect endpoint.
const transport = createConnectTransport({
  baseUrl: "http://localhost:8080",
});

// Here we make the client itself, combining the service
// definition with the transport.
const client = createPromiseClient(ExampleService, transport);

function App() {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<
    {
      fromMe: boolean;
      message: string;
    }[]
  >([]);
  return (
    <>
      <ol>
        {messages.map((msg, index) => (
          <li key={index}>{`${msg.fromMe ? "ME:" : "Dubbo Server:"} ${msg.message}`}</li>
        ))}
      </ol>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          // Clear inputValue since the user has submitted.
          setInputValue("");
          // Store the inputValue in the chain of messages and
          // mark this message as coming from "me"
          setMessages((prev) => [
            ...prev,
            {
              fromMe: true,
              message: inputValue,
            },
          ]);
          const response = await client.say({
            sentence: inputValue,
          });
          setMessages((prev) => [
            ...prev,
            {
              fromMe: false,
              message: response.sentence,
            },
          ]);
        }}
      >
        <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
        <button type="submit">Send</button>
      </form>
    </>
  );
}

export default App;
```

执行以下命令，即可得到样例页面

```Shell
npm run dev
```

## <span id="startServer">启动 Server</span>

接下来我们需要启动 Server
这里我们采用 Dubbo 服务嵌入的 Node.js 服务器，可以根据 Node RPC 文档中的步骤，配合 Fastify 启动 Server
不过需要注意，我们额外需要 @fastify/cors，来解决前端请求的跨域问题

```Shell
npm install @fastify/cors
```

需要在 server.ts 文件下修改
```typescript
...
import cors from "@fastify/cors";

...
async function main() {
  const server = fastify();
  ...
  await server.register(cors, {
    origin: true,
  });
  ...
  await server.listen({ host: "localhost", port: 8080 });
  ...
}

void main();
```

最后，运行代码启动服务

```Shell
npx tsx server.ts
```

## <span id="moreContent">更多内容</span>

- 使用 Dubbo JS 开发微服务
- 更多 Dubbo JS 特性

## <span id="transform">框架侧待改造</span>

- 协议细节还需商讨并修改
- 考虑后续整体生态，增强服务治理能力，添加日志等

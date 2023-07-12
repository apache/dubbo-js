# Apache Dubbo-js

## Dubbo 介绍

- Apache Dubbo 是一款 RPC 服务开发框架，用于解决微服务架构下的服务治理与通信问题，官方提供了 Java、Golang，TypeScript，Rust 等多语言 SDK 实现。使用 Dubbo 开发的微服务原生具备相互之间的远程地址发现与通信能力， 利用 Dubbo 提供的丰富服务治理特性，可以实现诸如服务发现、负载均衡、流量调度等服务治理诉求。Dubbo 被设计为高度可扩展，用户可以方便的实现流量拦截、选址的各种定制逻辑。

- 在云原生时代，Dubbo 相继衍生出了 Dubbo3、Proxyless Mesh 等架构与解决方案，在易用性、超大规模微服务实践、云原生基础设施适配、安全性等几大方向上进行了全面升级。

## Dubbo-js 介绍

- 随着微服务场景的大范围应用，多语言场景越来越普遍，开发人员更愿意使用更适合的语言，来实现一个复杂系统的不同模块。所以 Dubbo 提供几乎所有主流语言的 SDK 实现，定义了一套统一的微服务开发范式。Dubbo 与每种语言体系的主流应用开发框架做了适配，总体编程方式、配置符合大多数开发者已有编程习惯。

- Dubbo-js 与 JavaScript 生态系统集成，因为 Node.js 的轻量和高性能特点使其非常适合微服务架构，Web 端也需要直接向微服务发送请求。

- Dubbo-js 语言实现，架起 Node.js，Web 和 Java，Golang，Rust 等其他语言之间的桥梁，与 gRPC/Dubbo 生态互联互通，带领 Java 生态享受云原生时代的技术红利。

- Dubbo-js 包含对 Node.js，以及 Web 端的实现，并针对两者的不同运行环境，进行了相对应的优化。除此之外，Dubbo 对 express，fastify，next 等中间件进行集成，方便用户更方便的去用 Node.js 搭建一个 Dubbo 分布式服务框架。

## RPC 调用

- 完全支持 gRPC 协议，以及支持 [Triple 协议](https://cn.dubbo.apache.org/zh-cn/overview/reference/protocols/triple-spec/) 进行通信

- Triple 协议是 Dubbo3 生态主推的协议，是基于 gRPC 的扩展协议，底层为 HTTP2，可与 gRPC 服务互通。**相当于在 gRPC 可靠的传输基础上，增加了 Dubbo 的服务治理能力。**

## 序列化

- 借助 protocol buffer 实现序列化以及反序列化

## 服务治理

![](https://dubbogo.github.io/img/devops.png)

- **注册中心**:

  支持 Nacos（阿里开源） 、Zookeeper、ETCD、Consul、Polaris-mesh（腾讯开源） 等服务注册中间件，并拥有可扩展能力。我们也会根据用户使用情况，进一步扩展出用户需要的实现。

- **配置中心**:

  开发者可以使用 Nacos、Zookeeper 进行框架/用户的配置的发布和拉取。

- **负载均衡策略**:

  柔性服务, Random, RoundRobin, LeastActive, ConsistentHash 等

- **过滤器**:
  Echo, Hystrix, Token, AccessLog, TpsLimiter, ExecuteLimit, Generic, Auth/Sign, Metrics, Tracing, Active, Seata, Sentinel 等

- **泛化调用**:

- **监控**:
  Prometheus

- **链路追踪**:
  Jaeger, Zipkin

- **路由器**:
  Dubbo3 Router

## 快速开始

- 请访问 [Node DOCS](https://cn.dubbo.apache.org/zh-cn/overview/quickstart/Node.js/) 和 [Web DOCS](https://cn.dubbo.apache.org/zh-cn/overview/quickstart/Web/) 来了解如何简单的搭建一个基于 Node.js 的服务器，以及如何用 Node.js 或 Web 向服务器发送请求

## 如何贡献

- 请访问 [CONTRIBUTING](./CONTRIBUTING.md) 来了解如何提交更新以及贡献工作流。

## 联系

- [钉钉群](https://www.dingtalk.com/): 23331795

## 许可证

- Apache Dubbo-go 使用 Apache 许可证 2.0 版本，请参阅 LICENSE 文件了解更多。

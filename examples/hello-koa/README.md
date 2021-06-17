## QuickStart

### Development

> 以 `zookeeper` 注册中心方式启动：

```bash
$ cd ../../
$ sh ./dubbo-java/start-zookeeper-dubbo-service.sh
$ cd examples/hello-koa
$ yarn
$ yarn start
$ open http://localhost:4000/hello
```

> 以 `nacos` 注册中心方式启动：

```bash
$ cd ../../
$ sh ./dubbo-java/start-nacos-dubbo-service.sh
$ cd examples/hello-koa
$ yarn
$ yarn start-nacos
$ open http://localhost:5000/hello
```

### Requirement

- Node.js 14.x +
- Typescript 4.x+

### Attention

This example does not use a translator.

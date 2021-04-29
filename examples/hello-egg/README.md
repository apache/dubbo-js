## QuickStart

### Development

> 以 `zookeeper` 注册中心方式启动：

```bash
$ cd ../../
$ make
$ sh ./dubbo-java/start-zookeeper-dubbo-service.sh
$ cd examples/hello-egg
$ yarn
$ yarn interpret
$ yarn dev
$ open http://localhost:7001/
```

> 以 `nacos` 注册中心方式启动：

修改 `config.default.ts` 中 `config.dubbo` 改成

```js
config.dubbo = {
  application: {name: 'node-egg-bff'},
  // nacos 的链接 要以 nacos:// 开头
  registry: 'nacos://localhost:8848',
}
```

然后执行：

```bash
$ cd ../../
$ make
$ sh ./dubbo-java/start-nacos-dubbo-service.sh
$ cd examples/hello-egg
$ yarn
$ yarn interpret
$ yarn dev
$ open http://localhost:7001/
```

### Requirement

- Node.js 14.x +
- Typescript 4.x+

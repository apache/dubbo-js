## dubbo

nodejs 使用原生的 dubbo 协议打通了 dubbo 的 rpc 方法调用 .

## Getting Started

```shell
yarn add apache-dubbo-consumer
```

## How to Usage?

```typescript
import { Dubbo, java, TDubboCallResult } from 'apache-dubbo-consumer'
import { Zk, Nacos } from 'apache-dubbo-registry'

// 定义 dubbo 方法类型接口
// 方便代码自动提示
// 如果写的 JavaScript 忽略
interface IDemoService {
  sayHello(name: string): TDubboCallResult<string>

  echo(): TDubboCallResult<string>

  test(): TDubboCallResult<void>

  getUserInfo(): TDubboCallResult<{
    status: string
    info: { id: number; name: string }
  }>
}

// 创建 dubbo 对象
const dubbo = new Dubbo({
  application: {
    name: 'dubbo-js',
  },
  // nacos
  // registry: Nacos({
  //   connect: 'localhost:8848',
  // }),

  // zookeeper
  registry: Zk({
    connect: 'localhost:2181',
  }),
  dubboVersion: '2.0.2',
  services: {
    demoService,
  }
})

// 代理本地对象 -> dubbo 对象
const demoService = dubbo.proxyService<IDemoService>({
  dubboInterface: 'org.apache.dubbo.demo.DemoService',
  version: '1.0.0',
  methods: {
    sayHello(name) {
      // 仅仅做参数 hessian 化转换
      return [java.String(name)]
    },

    echo() {},

    test() {},

    getUserInfo() {
      // 仅仅做参数 hessian 化转换
      return [
        java.combine('com.alibaba.dubbo.demo.UserRequest', {
          id: 1,
          name: 'nodejs',
          email: 'node@qianmi.com'
        })
      ]
    }
  }
})

const result1 = await demoService.sayHello('node')
// print { err: null, res:'hello node from dubbo service' }
const res = await demoService.echo()
// print { err: null, res: 'pang' }

const res = await demoService.getUserInfo()
// status: 'ok', info: { id: '1', name: 'test' }
```

## as developer

```sh
brew install zookeeper
brew services start zookeeper

# 运行 java/dubbo-simple 下面的例子

yarn run test

# 全链路日志跟踪
DEBUG=dubbo*
```

## API

创建 Dubbo 对象

```javascript
const dubbo = new Dubbo({
  registry            // zookeeper/nacos 注册中心地址，类型 IRegistry，必填
  services            // 接口服务，必填
  dubboVersion        // 当前 dubbo 的版本，类型 string，必填 
  application         // 注册 consumer 应用的名称，类型：({ name: string })，可选
  enableHeartBeat     // 是否启用心跳机制，默认 true，类型 boolean，可选 
  dubboInvokeTimeout  // dubbo 调用超时时间，默认 10s， 类型 number， 可选 
  dubboSocketPool     // dubbo 创建 socket 的 pool 大小，默认 4， 类型 number， 可选 
  logger              // logger 对象，默认 console，可选
  zkRoot              // zk 的默认根路径，默认 /dubbo， 类型 string， 可选，如果是 nacos 注册中心，则不需要该字段 
});

// Or
const dubbo = Dubbo.from({
  ...
  // 参数同上
})

// dubbo 的代理服务
const demoSerivce = Dubbo.proxService({
  // 代理的服务接口 - string 必传
  dubboInterface: 'com.alibaba.dubbo.demo.DemoService',
  // 服务接口的版本 - string 必传
  version: '1.0.0',
  // 接口内的方法 - Array<Function> 必传
  methods: {
    // method name
    xx(params) {
      return [
        params
      ]
    }
  },
})
```

## FAQ

```javascript
import { Dubbo } from 'apache-dubbo-consumer'
```

默认导入的 dubbo-js 是按照 es2017 进行编译的，支持 node7.10 以上。

如果更低的 node 版本，可以使用

```javascript
import { Dubbo } from 'apache-dubbo-consuner/es6'
```

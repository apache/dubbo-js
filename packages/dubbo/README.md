## dubbo

nodejs 使用原生的 dubbo 协议打通了 dubbo 的 rpc 方法调用 .

## Getting Started

```shell
yarn add dubbo-js
```

## How to Usage?

```typescript
import {Dubbo, java, TDubboCallResult} from 'dubbo';

//定义dubbo方法类型接口
//方便代码自动提示
//如果写的JavaScript忽略
interface IDemoService {
  sayHello(name: string): TDubboCallResult<string>;

  echo(): TDubboCallResult<string>;

  test(): TDubboCallResult<void>;

  getUserInfo(): TDubboCallResult<{
    status: string;
    info: {id: number; name: string};
  }>;
}

//创建dubbo对象
const dubbo = new Dubbo({
  application: {name: 'dubbo-js'},
  //zookeeper address
  register: 'localhost:2181',
  dubboVersion: '2.0.0',
  interfaces: ['org.apache.dubbo.demo.DemoService'],
});

//代理本地对象->dubbo对象
const demoService = dubbo.proxyService<IDemoService>({
  dubboInterface: 'org.apache.dubbo.demo.DemoService',
  version: '1.0.0',
  methods: {
    sayHello(name) {
      //仅仅做参数hessian化转换
      return [java.String(name)];
    },

    echo() {},

    test() {},

    getUserInfo() {
      //仅仅做参数hessian化转换
      return [
        java.combine('com.alibaba.dubbo.demo.UserRequest', {
          id: 1,
          name: 'nodejs',
          email: 'node@qianmi.com',
        }),
      ];
    },
  },
});

const result1 = await demoService.sayHello('node');
//print {err: null, res:'hello node from dubbo service'}
const res = await demoService.echo();
//print {err: null, res: 'pang'}

const res = await demoService.getUserInfo();
//status: 'ok', info: { id: '1', name: 'test' }
```

## as developer

```sh
brew install zookeeper
brew services start zookeeper

#运行java/dubbo-simple下面的例子

yarn run test

# 全链路日志跟踪
DEBUG=dubbo*
```

## API

创建 Dubbo 对象

```javascript
const dubbo = new Dubbo({
  dubboVersion          //当前dubbo的版本 (string类型); 必传
  application           //记录应用的名称，zookeeper的调用时候写入consumer 类型：({name: string};) 可选
  enableHeartBeat       //是否启用心跳机制 默认true 可选 类型 boolean
  dubboInvokeTimeout    //设置dubbo调用超时时间默认10s 可选 类型number
  dubboSocketPool       //设置dubbo创建socket的pool大小，默认4 可选 类型number
  logger                //设置logger对象，可选
  register              //设置zookeeper注册中心地址 必填 类型string
  zkRoot                //zk的默认根路径，默认/dubbo 类型string
  interfaces            //设置zk监听的接口名称 类型 Array<string> 必填
});

// Or
const dubbo = Dubbo.from({
  dubboVersion          //当前dubbo的版本 (string类型); 必传
  application           //记录应用的名称，zookeeper的调用时候写入consumer 类型：({name: string};) 可选
  enableHeartBeat       //是否启用心跳机制 默认true 可选 类型 boolean
  dubboInvokeTimeout    //设置dubbo调用超时时间默认10s 可选 类型number
  dubboSocketPool       //设置dubbo创建socket的pool大小，默认4 可选 类型number
  logger                //设置logger对象，可选
  register              //设置zookeeper注册中心地址 必填 类型string
  zkRoot                //zk的默认根路径，默认/dubbo 类型string
  interfaces            //设置zk监听的接口名称 类型 Array<string> 必填
})

//dubbo的代理服务
const demoSerivce = Dubbo.proxService({
  //代理的服务接口 - string 必传
  dubboInterface: 'com.alibaba.dubbo.demo.DemoService',
  //服务接口的版本 - string 必传
  version: '1.0.0',
  //接口内的方法 - Array<Function> 必传
  methods: {
    //method name
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
import {Dubbo} from 'dubbo-js';
```

默认导入的 dubbo-js 是按照 es2017 进行编译的，支持 node7.10 以上。

如果更低的 node 版本，可以使用

```javascript
import {Dubbo} from 'dubbo-js/es6';
```

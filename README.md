## dubbo2.js

![love dubbo](https://raw.githubusercontent.com/dubbo/dubbo2.js/master/resources/dubbo-love.png)

多年期盼，一朝梦圆！ We love dubbo 👏

感谢 [js-to-java](https://github.com/node-modules/js-to-java),[hessian.js](https://github.com/node-modules/hessian.js) 两大核心模块, 感谢[fengmk2](https://github.com/fengmk2)和[dead-horse](https://github.com/dead-horse)老师。

nodejs 使用原生的 dubbo (dubbo head + hessian body) 协议打通了 dubbo 的 rpc 方法调用 .

## Features

1.  Support zookeeper as register center

2.  TCP Dubbo Native protocol （Dubbo Header + Hessian Body）

3.  Socket Pool (ServerAgent -> SocketPool -> SocketWorker)

4.  Support Directly Dubbo (const Dubbo = DirectlyDubbo({..}))

5.  Middleware, Easy to extend.

6.  Tracing

7.  Supported Dubbox

8.  Typescript type definition

9.  Convert java dubbo interface to typescript module

## Getting Started

```shell
yarn add dubbo2.js # or npm install dubbo2.js --save
```

## How to Usage?

```typescript
import {Dubbo, java, TDubboCallResult} from 'dubbo2.js';

//定义dubbo方法类型接口
//方便代码自动提示
//实际项目中会通过我们的[翻译师]工具自动根据java接口字节码jar包
//自动生成
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
  application: {name: 'node-dubbo'},
  //zookeeper address
  register: 'localhost:2181',
  dubboVersion: '2.0.0',
  interfaces: ['com.alibaba.dubbo.demo.DemoService'],
});

//代理本地对象->dubbo对象
const demoService = dubbo.proxyService<IDemoService>({
  dubboInterface: 'com.alibaba.dubbo.demo.DemoService',
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

//main method
(async () => {
  const result1 = await demoService.sayHello('node');
  //print {err: null, res:'hello node from dubbo service'}
  const res = await demoService.echo();
  //print {err: null, res: 'pang'}

  const res = await demoService.getUserInfo();
  //status: 'ok', info: { id: '1', name: 'test' }
})();
```

## as developer

```sh
brew install zookeeper
brew services start zookeeper

#运行java/dubbo-demo-provider下面的例子

yarn run test

# 全链路日志跟踪
DEBUG=dubbo* yarn run test
```

![dubbo-flow](https://raw.githubusercontent.com/dubbo/dubbo2.js/master/resources/dubbo2-flow.png)

## API

### create dubbo object

```javascript
const dubbo = new Dubbo({
  isSupportedDubbox     //是不是支持dubbox (boolean类型); 可选，默认false
  application           //记录应用的名称，zookeeper的调用时候写入consumer 类型：({name: string};) 可选
  dubboInvokeTimeout    //设置dubbo调用超时时间默认10s 可选 类型number
  dubboSocketPool       //设置dubbo创建socket的pool大小，默认4 可选 类型number
  register              //设置zookeeper注册中心地址 必填 类型string
  zkRoot                //zk的默认根路径，默认/dubbo 类型string
  interfaces            //设置zk监听的接口名称 类型 Array<string> 必填
});

// Or
const dubbo = Dubbo.from({
  isSupportedDubbox     //是不是支持dubbox (boolean类型); 可选，默认false
  application           //记录应用的名称，zookeeper的调用时候写入consumer 类型：({name: string};) 可选
  dubboInvokeTimeout    //设置dubbo调用超时时间默认10s 可选 类型number
  dubboSocketPool       //设置dubbo创建socket的pool大小，默认4 可选 类型number
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
  //超时时间 number 可选
  timeout: 10
  //所属组 string 可选
  group: 'qianmi',
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

### connect dubbo directly

```typescript
import {DirectlyDubbo, java} from 'dubbo2.js';
import {
  DemoProvider,
  DemoProviderWrapper,
  IDemoProvider,
} from './providers/com/alibaba/dubbo/demo/DemoProvider';
import {UserRequest} from './providers/com/alibaba/dubbo/demo/UserRequest';

const dubbo = DirectlyDubbo.from({
  dubboAddress: 'localhost:20880',
  dubboVersion: '2.0.0',
  dubboInvokeTimeout: 10,
});

const demoService = dubbo.proxyService<IDemoProvider>({
  dubboInterface: 'com.alibaba.dubbo.demo.DemoProvider',
  methods: DemoProviderWrapper,
  version: '1.0.0',
});
```

## dubbo was ready?

```javascript
const dubbo = Dubbo.from(/*...*/);

(async () => {
  await dubbo.ready();
  //TODO dubbo was ready
})();

//egg.js
app.beforeStart(async () => {
  await dubbo.ready();
  app.logger.info('dubbo was ready...');
});
```

## dubbo's subscriber

```javascript
const dubbo = Dubbo.from(/*...*/);

dubbo.subcribe({
  onReady: () => {
    //dubbo was ready.
    //TODO for example logger
  },
  onSysError: err => {
    //dubbo occur error
    //TODO dingTalkRobot.send('error')
  },
  onStatistics: stat => {
    //get invoke time statistics info
    //in order to know load whether balance
  },
});
```

## middleware

通过对调用链路的抽象使用和 koa 相同的 middleware 机制，方便自定义拦截器，比如 logger，

```js
//cost-time middleware
dubbo.use(async (ctx, next) => {
  const startTime = Date.now();
  await next();
  const endTime = Date.now();
  console.log('invoke cost time->', endTime - startTime);
});
```

## dubbo-invoker

在 dubbo 的接口调用中，需要设置一些动态的参数如，version, group, timeout, retry 等常常

这些参数需要在 consumer 调用方才精确设定值，之前是在 interpret 翻译生成 ts 的代码里面进行设置这个不够灵活，所以这里面我就抽象一个 dubbo-invoker 作为设置参数的 middleware

```javascript
import {dubboInvoker, matcher} from 'dubbo-invoker';

//init
const dubbo = Dubbo.from(/*....*/);
//set params
dubbo.use(
  dubboInvoke(
    matcher
      //精确匹配接口
      .match('com.alibaba.demo.UserProvider', {
        version: '1.0.0',
        group: 'user',
      })
      //正则匹配
      .match(/^com.alibaba.dubbo/, {
        version: '2.0.0',
        group: '',
      })
      //match thunk
      match((ctx) => {
        //computed....
        return true
      }, {
        version: '3.0.0'
      })
      .,
  ),
);
```

## Translator => Cool.

我们坚定的认为开发体验同用户的体验同等重要，我们做了一些创新，一些很酷的实践。

为了使 node 和 dubbo 之间的调用像 java 调用 dubbo 一样简单透明，我们设计和实现了 [translator](./packages/interpret-cli).

通过分析 java 的 jar 包中的 bytecode 提取 dubbo 调用的接口信息，自动生成 typescript 类型定义文件以及调用的代码。

在 packages/dubbo/src/**tests**/provider 就是根据 java 目录下的 demo 翻译而来。

我们希望整个 dubbo 调用的代码都可以无缝生成。

**_职责_**

1.  翻译 Interface 代码,生成 node 端可调用代码;
2.  自动将参数转换为 hessian.js 能识别的对象;
3.  接口方法及参数类型提示;

[translator 详细介绍](./packages/interpret-cli)

## Performance

```text
❯ loadtest -t 20 -c 200 http://localhost:3000/hello -k
[Mon Jun 04 2018 14:34:27 GMT+0800 (CST)] INFO Requests: 0, requests per second: 0, mean latency: 0 ms
[Mon Jun 04 2018 14:34:32 GMT+0800 (CST)] INFO Requests: 35956, requests per second: 7215, mean latency: 27.9 ms
[Mon Jun 04 2018 14:34:37 GMT+0800 (CST)] INFO Requests: 77133, requests per second: 8238, mean latency: 24.3 ms
[Mon Jun 04 2018 14:34:42 GMT+0800 (CST)] INFO Requests: 116531, requests per second: 7869, mean latency: 25.4 ms
[Mon Jun 04 2018 14:34:47 GMT+0800 (CST)] INFO
[Mon Jun 04 2018 14:34:47 GMT+0800 (CST)] INFO Target URL:          http://localhost:3000/hello
[Mon Jun 04 2018 14:34:47 GMT+0800 (CST)] INFO Max time (s):        20
[Mon Jun 04 2018 14:34:47 GMT+0800 (CST)] INFO Concurrency level:   200
[Mon Jun 04 2018 14:34:47 GMT+0800 (CST)] INFO Agent:               keepalive
[Mon Jun 04 2018 14:34:47 GMT+0800 (CST)] INFO
[Mon Jun 04 2018 14:34:47 GMT+0800 (CST)] INFO Completed requests:  156836
[Mon Jun 04 2018 14:34:47 GMT+0800 (CST)] INFO Total errors:        0
[Mon Jun 04 2018 14:34:47 GMT+0800 (CST)] INFO Total time:          20.001182913 s
[Mon Jun 04 2018 14:34:47 GMT+0800 (CST)] INFO Requests per second: 7841
[Mon Jun 04 2018 14:34:47 GMT+0800 (CST)] INFO Mean latency:        25.4 ms
[Mon Jun 04 2018 14:34:47 GMT+0800 (CST)] INFO
[Mon Jun 04 2018 14:34:47 GMT+0800 (CST)] INFO Percentage of the requests served within a certain time
[Mon Jun 04 2018 14:34:47 GMT+0800 (CST)] INFO   50%      24 ms
[Mon Jun 04 2018 14:34:47 GMT+0800 (CST)] INFO   90%      33 ms
[Mon Jun 04 2018 14:34:47 GMT+0800 (CST)] INFO   95%      36 ms
[Mon Jun 04 2018 14:34:47 GMT+0800 (CST)] INFO   99%      50 ms
[Mon Jun 04 2018 14:34:47 GMT+0800 (CST)] INFO  100%      124 ms (longest request)
```

## FAQ

```javascript
import {Dubbo} from 'dubbo2.js';
```

默认导入的 dubbo2.js 是按照 es2017 进行编译的，支持 node7.10 以上。

如果更低的 node 版本，可以使用

```javascript
import {Dubbo} from 'dubbo2.js/es6';
```

## 怎么参与开发？

1.欢迎 pr

2.欢迎 issue

## 分享直戳

[talk](https://github.com/hufeng/iThink/tree/master/talk)

## dubbo

nodejs 使用原生的 dubbo 协议打通了 dubbo 的 rpc 方法调用 .

感谢阿里的 hessian.js 和 js-to-java 两大模块

## Getting Started

```shell
npm install dubbo2.js
```

## How to Usage?

```typescript
import {Dubbo, java, TDubboCallResult} from 'dubbo';

//定义dubbo方法类型接口
//方便代码自动提示
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
  application: {name: 'dubbo-directly-test'},
  //zookeeper address
  register: 'localhost:2181',
  dubboVersion: '2.0.0',
  interfaces: ['com.alibaba.dubbo.demo.DemoService'],
});

//代理本地对象->dubbo对象
const demoService = dubbo.proxyService<IDemoService>({
  dubboInterface: 'com.alibaba.dubbo.demo.DemoService',
  version: '0.0.0',
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
DEBUG=dubbo* yarn run test
```

![log](https://raw.githubusercontent.com/hufeng/dubbo.js/master/screenshot/1.jpg)
![log](https://raw.githubusercontent.com/hufeng/dubbo.js/master/screenshot/2.jpg)

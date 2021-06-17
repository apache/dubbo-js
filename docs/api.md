---
id: api
title: api
sidebar_label: API
---

### create dubbo object

```javascript
const dubbo = new Dubbo({
  isSupportedDubbox     //是不是支持dubbox (boolean类型); 可选，默认false
  application           //记录应用的名称，zookeeper的调用时候写入consumer 类型：({name: string};) 可选
  dubboInvokeTimeout    //设置dubbo调用超时时间默认5s 可选 类型number
  dubboSocketPool       //设置dubbo创建socket的pool大小，默认1 可选 类型number
  register              //设置zookeeper注册中心地址 必填 类型string
  zkRoot                //zk的默认根路径，默认/dubbo 类型string 可选
  interfaces            //设置zk监听的接口名称 类型 Array<string> 必填, 在dubbo2.js@2.0.4+版本中不在使用这个参数
  service               //注入到dubbo容器的dubbo服务，类型Object, 在dubbo2.js@2.0.4+使用
});

// Or static factory method, and the parameters the same as above.
const dubbo = Dubbo.from({
  isSupportedDubbox     //是不是支持dubbox (boolean类型); 可选，默认false
  application           //记录应用的名称，zookeeper的调用时候写入consumer 类型：({name: string};) 可选
  dubboInvokeTimeout    //设置dubbo调用超时时间默认5s 可选 类型number
  dubboSocketPool       //设置dubbo创建socket的pool大小，默认1 可选 类型number
  register              //设置zookeeper注册中心地址 必填 类型string
  zkRoot                //zk的默认根路径，默认/dubbo 类型string 可选
  interfaces            //设置zk监听的接口名称 类型 Array<string> 必填, 在dubbo2.js@2.0.4+版本中不在使用这个参数
  service               //注入到dubbo容器的dubbo服务，类型Object, 在dubbo2.js@2.0.4+使用
})


//dubbo 的代理服务
const demoSerivce = dubbo.proxService({
  //代理的服务接口 - string 必传
  dubboInterface: 'com.alibaba.dubbo.demo.DemoService',
  //服务接口的版本 - string 可选
  version: '1.0.0',
  //超时时间 number 可选
  timeout: 10
  //所属组 string 可选
  group: 'qianmi',
  //接口内的方法 - Array<Function> 必传
  methods: {
    //method name
    sayHello(name) {
      //仅仅做参数hessian化转换，封装传递的给后端dubbo接口的参数
      return [java.String(name)];
    },
    //method name
    getUserInfo() {
      //仅仅做参数hessian化转换，封装传递的给后端dubbo接口的参数
      return [
        java.combine('com.alibaba.dubbo.demo.UserRequest', {
          id: 1,
          name: 'nodejs',
          email: 'node@qianmi.com',
        }),
      ];
    },
  },
})
```

### connect dubbo directly

```typescript
import { DirectlyDubbo, java } from 'apache-dubbo-js'
import {
  DemoProvider,
  DemoProviderWrapper,
  IDemoProvider
} from './providers/com/alibaba/dubbo/demo/DemoProvider'
import { UserRequest } from './providers/com/alibaba/dubbo/demo/UserRequest'

const dubbo = DirectlyDubbo.from({
  dubboAddress: 'localhost:20880',
  dubboVersion: '2.0.0',
  dubboInvokeTimeout: 10
})

const demoService = dubbo.proxyService<IDemoProvider>({
  dubboInterface: 'com.alibaba.dubbo.demo.DemoProvider',
  methods: DemoProviderWrapper,
  version: '1.0.0'
})
```

## When dubbo was ready?

```javascript
/**
 * dubbo的连接是异步的，有没有连接成功，通常需要到runtime才可以知道
 * 这时候可能会给我们一些麻烦，我们必须发出一个请求才能知道dubbo状态
 * 基于这种场景，我们提供一个方法，来告诉外部，dubbo是不是初始化成功，
 * 这样在node启动的过程中就知道dubbo的连接状态，如果连不上我们就可以
 * 及时的fixed
 */
const dubbo = Dubbo.from(/*...*/);

//普通使用方法
(async () => {
  await dubbo.ready();
})();

/**
 * 比如和egg配合起来，egg提供了beforeStart方法
 * 通过ready方法来等待dubbo初始化成功
 */
 //app.js
 export default (app: EggApplication) => {
   const dubbo = Dubbo.from({....})
   app.beforeStart(async () => {
     await dubbo.ready();
     console.log('dubbo was ready...');
   })
 }
```

## dubbo's subscriber

```javascript
const dubbo = Dubbo.from(/*...*/)

dubbo.subscribe({
  onTrace(msg: ITrace) {
    console.log(msg)
  }
})
```

you should get runtime trace info

```text
{ type: 'INFO', msg: 'dubbo:bootstrap version => 2.1.5' }
{ type: 'INFO', msg: 'connected to zkserver localhost:2181' }
{ type: 'INFO',
  msg: 'ServerAgent create socket-pool: 172.19.6.203:20880' }
{ type: 'INFO',
  msg: 'socket-pool: 172.19.6.203:20880 poolSize: 1' }
{ type: 'INFO',
  msg: 'new SocketWorker#1 |> 172.19.6.203:20880' }
{ type: 'INFO',
  msg: 'SocketWorker#1 =connecting=> 172.19.6.203:20880' }
{ type: 'INFO',
  msg: 'SocketWorker#1 <=connected=> 172.19.6.203:20880' }
{ type: 'INFO', msg: 'scheduler is ready' }
{ type: 'INFO',
  msg: 'trigger watch /dubbo/com.alibaba.dubbo.demo.DemoProvider/providers, type: NODE_CHILDREN_CHANGED' }
{ type: 'INFO',
  msg: 'trigger watch /dubbo/com.alibaba.dubbo.demo.ErrorProvider/providers, type: NODE_CHILDREN_CHANGED' }
{ type: 'INFO',
  msg: 'trigger watch /dubbo/com.alibaba.dubbo.demo.BasicTypeProvider/providers, type: NODE_CHILDREN_CHANGED' }
{ type: 'ERR',
  msg: Error: Can not be found any agents
    at Object.Scheduler._handleZkClientOnData [as onData] (/Users/hufeng/Github/dubbo2.js/packages/dubbo/es7/scheduler.js:68:29)
    at EventEmitter.<anonymous> (/Users/hufeng/Github/dubbo2.js/packages/dubbo/es7/zookeeper.js:275:30)
    at <anonymous>
    at process._tickCallback (internal/process/next_tick.js:118:7) }
{ type: 'ERR',
  msg: Error: SocketWorker#1 <=closed=> 172.19.6.203:20880 retry: 6
    at SocketWorker._onClose (/Users/hufeng/Github/dubbo2.js/packages/dubbo/es7/socket-worker.js:78:29)
    at Socket.emit (events.js:180:13)
    at TCP._handle.close [as _onclose] (net.js:541:12) }
{ type: 'INFO',
  msg: 'SocketWorker#1 =connecting=> 172.19.6.203:20880' }
{ type: 'ERR',
  msg:
   { Error: connect ECONNREFUSED 172.19.6.203:20880
    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1173:14)
     errno: 'ECONNREFUSED',
     code: 'ECONNREFUSED',
     syscall: 'connect',
     address: '172.19.6.203',
     port: 20880 } }
{ type: 'ERR',
  msg: Error: SocketWorker#1 <=closed=> 172.19.6.203:20880 retry: 5
    at SocketWorker._onClose (/Users/hufeng/Github/dubbo2.js/packages/dubbo/es7/socket-worker.js:78:29)
    at Socket.emit (events.js:180:13)
    at TCP._handle.close [as _onclose] (net.js:541:12) }
{ type: 'INFO',
  msg: 'trigger watch /dubbo/com.alibaba.dubbo.demo.DemoProvider/providers, type: NODE_CHILDREN_CHANGED' }
{ type: 'INFO',
  msg: 'trigger watch /dubbo/com.alibaba.dubbo.demo.BasicTypeProvider/providers, type: NODE_CHILDREN_CHANGED' }
{ type: 'INFO',
  msg: 'trigger watch /dubbo/com.alibaba.dubbo.demo.ErrorProvider/providers, type: NODE_CHILDREN_CHANGED' }
{ type: 'INFO',
  msg: 'trigger watch /dubbo/com.alibaba.dubbo.demo.ErrorProvider/providers, type: NODE_CHILDREN_CHANGED' }
{ type: 'INFO',
  msg: 'trigger watch /dubbo/com.alibaba.dubbo.demo.DemoProvider/providers, type: NODE_CHILDREN_CHANGED' }
{ type: 'INFO',
  msg: 'trigger watch /dubbo/com.alibaba.dubbo.demo.BasicTypeProvider/providers, type: NODE_CHILDREN_CHANGED' }
{ type: 'ERR',
  msg: Error: Can not be found any agents
    at Object.Scheduler._handleZkClientOnData [as onData] (/Users/hufeng/Github/dubbo2.js/packages/dubbo/es7/scheduler.js:68:29)
    at EventEmitter.<anonymous> (/Users/hufeng/Github/dubbo2.js/packages/dubbo/es7/zookeeper.js:275:30)
    at <anonymous>
    at process._tickCallback (internal/process/next_tick.js:118:7) }
{ type: 'INFO',
  msg: 'SocketWorker#1 =connecting=> 172.19.6.203:20880' }
{ type: 'ERR',
  msg:
   { Error: connect ECONNREFUSED 172.19.6.203:20880
    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1173:14)
     errno: 'ECONNREFUSED',
     code: 'ECONNREFUSED',
     syscall: 'connect',
     address: '172.19.6.203',
     port: 20880 } }
{ type: 'ERR',
  msg: Error: SocketWorker#1 <=closed=> 172.19.6.203:20880 retry: 4
    at SocketWorker._onClose (/Users/hufeng/Github/dubbo2.js/packages/dubbo/es7/socket-worker.js:78:29)
    at Socket.emit (events.js:180:13)
    at TCP._handle.close [as _onclose] (net.js:541:12) }
{ type: 'INFO',
  msg: 'SocketWorker#1 =connecting=> 172.19.6.203:20880' }
{ type: 'ERR',
  msg:
   { Error: connect ECONNREFUSED 172.19.6.203:20880
    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1173:14)
     errno: 'ECONNREFUSED',
     code: 'ECONNREFUSED',
     syscall: 'connect',
     address: '172.19.6.203',
     port: 20880 } }
{ type: 'ERR',
  msg: Error: SocketWorker#1 <=closed=> 172.19.6.203:20880 retry: 3
    at SocketWorker._onClose (/Users/hufeng/Github/dubbo2.js/packages/dubbo/es7/socket-worker.js:78:29)
    at Socket.emit (events.js:180:13)
    at TCP._handle.close [as _onclose] (net.js:541:12) }
{ type: 'INFO',
  msg: 'SocketWorker#1 =connecting=> 172.19.6.203:20880' }
{ type: 'ERR',
  msg:
   { Error: connect ECONNREFUSED 172.19.6.203:20880
    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1173:14)
     errno: 'ECONNREFUSED',
     code: 'ECONNREFUSED',
     syscall: 'connect',
     address: '172.19.6.203',
     port: 20880 } }
{ type: 'ERR',
  msg: Error: SocketWorker#1 <=closed=> 172.19.6.203:20880 retry: 2
    at SocketWorker._onClose (/Users/hufeng/Github/dubbo2.js/packages/dubbo/es7/socket-worker.js:78:29)
    at Socket.emit (events.js:180:13)
    at TCP._handle.close [as _onclose] (net.js:541:12) }
{ type: 'INFO',
  msg: 'SocketWorker#1 =connecting=> 172.19.6.203:20880' }
{ type: 'ERR',
  msg:
   { Error: connect ECONNREFUSED 172.19.6.203:20880
    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1173:14)
     errno: 'ECONNREFUSED',
     code: 'ECONNREFUSED',
     syscall: 'connect',
     address: '172.19.6.203',
     port: 20880 } }
{ type: 'ERR',
  msg: Error: SocketWorker#1 <=closed=> 172.19.6.203:20880 retry: 1
    at SocketWorker._onClose (/Users/hufeng/Github/dubbo2.js/packages/dubbo/es7/socket-worker.js:78:29)
    at Socket.emit (events.js:180:13)
    at TCP._handle.close [as _onclose] (net.js:541:12) }
{ type: 'INFO',
  msg: 'SocketWorker#1 =connecting=> 172.19.6.203:20880' }
{ type: 'ERR',
  msg:
   { Error: connect ECONNREFUSED 172.19.6.203:20880
    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1173:14)
     errno: 'ECONNREFUSED',
     code: 'ECONNREFUSED',
     syscall: 'connect',
     address: '172.19.6.203',
     port: 20880 } }
{ type: 'ERR',
  msg: Error: SocketWorker#1 <=closed=> 172.19.6.203:20880 retry: 0
    at SocketWorker._onClose (/Users/hufeng/Github/dubbo2.js/packages/dubbo/es7/socket-worker.js:78:29)
    at Socket.emit (events.js:180:13)
    at TCP._handle.close [as _onclose] (net.js:541:12) }
{ type: 'ERR',
  msg: Error: 172.19.6.203:20880's pool socket-worker had all closed. delete 172.19.6.203:20880
    at ServerAgent._clearClosedPool (/Users/hufeng/Github/dubbo2.js/packages/dubbo/es7/serverNacos-agent.js:66:33)
    at Object.onClose (/Users/hufeng/Github/dubbo2.js/packages/dubbo/es7/serverNacos-agent.js:51:34)
    at SocketWorker._onClose (/Users/hufeng/Github/dubbo2.js/packages/dubbo/es7/socket-worker.js:97:34)
    at Socket.emit (events.js:180:13)
    at TCP._handle.close [as _onclose] (net.js:541:12) }
{ type: 'INFO',
  msg: 'trigger watch /dubbo/com.alibaba.dubbo.demo.DemoProvider/providers, type: NODE_CHILDREN_CHANGED' }
{ type: 'INFO',
  msg: 'ServerAgent create socket-pool: 172.19.6.203:20880' }
{ type: 'INFO',
  msg: 'socket-pool: 172.19.6.203:20880 poolSize: 1' }
{ type: 'INFO',
  msg: 'new SocketWorker#2 |> 172.19.6.203:20880' }
{ type: 'INFO',
  msg: 'SocketWorker#2 =connecting=> 172.19.6.203:20880' }
{ type: 'INFO',
  msg: 'SocketWorker#2 <=connected=> 172.19.6.203:20880' }
{ type: 'INFO', msg: 'scheduler is ready' }
{ type: 'INFO',
  msg: 'trigger watch /dubbo/com.alibaba.dubbo.demo.BasicTypeProvider/providers, type: NODE_CHILDREN_CHANGED' }
{ type: 'INFO',
  msg: 'trigger watch /dubbo/com.alibaba.dubbo.demo.ErrorProvider/providers, type: NODE_CHILDREN_CHANGED' }
```

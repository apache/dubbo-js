---
id: troubleshooting
title: Troubleshooting
sidebar_label: Troubleshooting
---

```javascript
import { Dubbo } from 'apache-dubbo-js'
```

默认导入的 apache-dubbo-js 是按照 es2017 进行编译的，支持 node7.10 以上。

如果更低的 node 版本，可以使用

```javascript
import { Dubbo } from 'apache-dubbo-js/es6'
```

## 报错了，为什么呢？

我们使用了 debug 模块，做了全流程的日志跟踪(开发状态)，可以通过开启来跟踪整个过程

如果是使用 egg,

```sh
DEBUG=dubbo* yarn run dev #(egg-bin dev)
```

如果是其他的比如 pm2

```sh
DEBUG=dubbo* pm2 start xxxx
```

最普通

```sh
DEBUG=dubbo* node serverNacos.js
```

## log example

```text
❯ DEBUG=dubbo* node serverNacos.js
  dubbo:queue new Queue +0ms
  dubbo:bootstrap dubbo2.js version :=> 2.1.5 +0ms
  dubbo:bootstrap initial:|> { application: { name: 'dubbo-node-consumer' },
  dubbo:bootstrap   register: 'localhost:2181',
  dubbo:bootstrap   service:
  dubbo:bootstrap    { demoProvider: [Function],
  dubbo:bootstrap      basicTypeProvider: [Function],
  dubbo:bootstrap      errorProvider: [Function] } } +1ms
  dubbo:bootstrap config:|> { dubboInvokeTimeout: 5, dubboSocketPool: 1 } +2ms
  dubbo:bootstrap interfaces:|> [ 'com.alibaba.dubbo.demo.DemoProvider',
  'com.alibaba.dubbo.demo.BasicTypeProvider',
  'com.alibaba.dubbo.demo.ErrorProvider' ] +1ms
  dubbo:scheduler new:|> { zkRoot: undefined,
  dubbo:scheduler   register: 'localhost:2181',
  dubbo:scheduler   application: { name: 'dubbo-node-consumer' },
  dubbo:scheduler   interfaces:
  dubbo:scheduler    [ 'com.alibaba.dubbo.demo.DemoProvider',
  dubbo:scheduler      'com.alibaba.dubbo.demo.BasicTypeProvider',
  dubbo:scheduler      'com.alibaba.dubbo.demo.ErrorProvider' ] } +0ms
  dubbo:zookeeper new:|> { zkRoot: undefined,
  dubbo:zookeeper   register: 'localhost:2181',
  dubbo:zookeeper   application: { name: 'dubbo-node-consumer' },
  dubbo:zookeeper   interfaces:
  dubbo:zookeeper    [ 'com.alibaba.dubbo.demo.DemoProvider',
  dubbo:zookeeper      'com.alibaba.dubbo.demo.BasicTypeProvider',
  dubbo:zookeeper      'com.alibaba.dubbo.demo.ErrorProvider' ] } +0ms
  dubbo:zookeeper connecting zkserver localhost:2181 +0ms
{ type: 'INFO', msg: 'dubbo:bootstrap version => 2.1.5' }
  dubbo:zookeeper connected to zkserver localhost:2181 +73ms
{ type: 'INFO', msg: 'connected to zkserver localhost:2181' }
  dubbo:dubbo-url DubboUrl from -> dubbo://172.19.6.203:20880/com.alibaba.dubbo.demo.DemoProvider?anyhost=true&application=demo-provider&default.timeout=1500&dubbo=2.5.7&generic=false&interface=com.alibaba.dubbo.demo.DemoProvider&methods=sayHello,test,echo,getUserInfo&pid=18647&revision=1.0.0&sayHello.timeout=8000&side=provider&timeout=10000&timestamp=1530239555926&version=1.0.0 +0ms
  dubbo:dubbo-url DubboUrl from -> dubbo://172.19.6.203:20880/com.alibaba.dubbo.demo.BasicTypeProvider?anyhost=true&application=demo-provider&default.timeout=1500&dubbo=2.5.7&generic=false&interface=com.alibaba.dubbo.demo.BasicTypeProvider&methods=testBasicType&pid=18647&revision=2.0.0&side=provider&timestamp=1530239556422&version=2.0.0 +4ms
  dubbo:dubbo-url DubboUrl from -> dubbo://172.19.6.203:20880/com.alibaba.dubbo.demo.ErrorProvider?anyhost=true&application=demo-provider&default.timeout=1500&dubbo=2.5.7&generic=false&interface=com.alibaba.dubbo.demo.ErrorProvider&methods=errorTest&pid=18647&revision=1.0.0&side=provider&timestamp=1530239556477&version=1.0.0 +2ms
  dubbo:zookeeper agentAddrSet: Set { '172.19.6.203:20880' } +12ms
  dubbo:zookeeper dubboServiceUrl:|> Map {
  dubbo:zookeeper   'com.alibaba.dubbo.demo.DemoProvider' => [ DubboUrl {
  dubbo:zookeeper     _url: [Url],
  dubbo:zookeeper     _query: [Object],
  dubbo:zookeeper     host: '172.19.6.203',
  dubbo:zookeeper     port: 20880,
  dubbo:zookeeper     path: 'com.alibaba.dubbo.demo.DemoProvider',
  dubbo:zookeeper     dubboVersion: '2.5.7',
  dubbo:zookeeper     version: '1.0.0',
  dubbo:zookeeper     group: '' } ],
  dubbo:zookeeper   'com.alibaba.dubbo.demo.BasicTypeProvider' => [ DubboUrl {
  dubbo:zookeeper     _url: [Url],
  dubbo:zookeeper     _query: [Object],
  dubbo:zookeeper     host: '172.19.6.203',
  dubbo:zookeeper     port: 20880,
  dubbo:zookeeper     path: 'com.alibaba.dubbo.demo.BasicTypeProvider',
  dubbo:zookeeper     dubboVersion: '2.5.7',
  dubbo:zookeeper     version: '2.0.0',
  dubbo:zookeeper     group: '' } ],
  dubbo:zookeeper   'com.alibaba.dubbo.demo.ErrorProvider' => [ DubboUrl {
  dubbo:zookeeper     _url: [Url],
  dubbo:zookeeper     _query: [Object],
  dubbo:zookeeper     host: '172.19.6.203',
  dubbo:zookeeper     port: 20880,
  dubbo:zookeeper     path: 'com.alibaba.dubbo.demo.ErrorProvider',
  dubbo:zookeeper     dubboVersion: '2.5.7',
  dubbo:zookeeper     version: '1.0.0',
  dubbo:zookeeper     group: '' } ] } +0ms
  dubbo:scheduler get agent address:=> Set { '172.19.6.203:20880' } +90ms
  dubbo:serverNacos-agent agerntAddrs: Set { '172.19.6.203:20880' } +0ms
  dubbo:zookeeper init providerMap and agentSet +5ms
  dubbo:serverNacos-agent create ServerAgent: 172.19.6.203:20880 +0ms
{ type: 'INFO',
  msg: 'ServerAgent create socket-pool: 172.19.6.203:20880' }
  dubbo:socket-pool new:|> {
  dubbo:socket-pool   "url": "172.19.6.203:20880",
  dubbo:socket-pool   "poolSize": 1
  dubbo:socket-pool } +0ms
{ type: 'INFO',
  msg: 'socket-pool: 172.19.6.203:20880 poolSize: 1' }
  dubbo:socket-worker new SocketWorker#1|> 172.19.6.203:20880 PADDING +0ms
{ type: 'INFO',
  msg: 'new SocketWorker#1 |> 172.19.6.203:20880' }
  dubbo:decode-buffer new DecodeBuffer +0ms
  dubbo:socket-worker SocketWorker#1 =connecting=> 172.19.6.203:20880 +0ms
{ type: 'INFO',
  msg: 'SocketWorker#1 =connecting=> 172.19.6.203:20880' }
  dubbo:socket-worker SocketWorker#1 <=connected=> 172.19.6.203:20880 +1ms
{ type: 'INFO',
  msg: 'SocketWorker#1 <=connected=> 172.19.6.203:20880' }
  dubbo:scheduler scheduler receive SocketWorker connect pid#1 172.19.6.203:20880 +3ms
{ type: 'INFO', msg: 'scheduler is ready' }
  dubbo:zookeeper create successfully consumer url: /dubbo/com.alibaba.dubbo.demo.DemoProvider/consumers/consumer://172.19.6.203/com.alibaba.dubbo.demo.DemoProvider?host=172.19.6.203&port=20880&interface=com.alibaba.dubbo.demo.DemoProvider&application=dubbo-node-consumer&category=consumers&dubbo=2.5.7&method=&revision=&version=1.0.0&side=consumer&check=false&timestamp=1530242060644 +8ms
  dubbo:zookeeper create Consumer finish +1ms
  dubbo:zookeeper create successfully consumer url: /dubbo/com.alibaba.dubbo.demo.BasicTypeProvider/consumers/consumer://172.19.6.203/com.alibaba.dubbo.demo.BasicTypeProvider?host=172.19.6.203&port=20880&interface=com.alibaba.dubbo.demo.BasicTypeProvider&application=dubbo-node-consumer&category=consumers&dubbo=2.5.7&method=&revision=&version=2.0.0&side=consumer&check=false&timestamp=1530242060646 +14ms
  dubbo:zookeeper create Consumer finish +0ms
  dubbo:zookeeper create successfully consumer url: /dubbo/com.alibaba.dubbo.demo.ErrorProvider/consumers/consumer://172.19.6.203/com.alibaba.dubbo.demo.ErrorProvider?host=172.19.6.203&port=20880&interface=com.alibaba.dubbo.demo.ErrorProvider&application=dubbo-node-consumer&category=consumers&dubbo=2.5.7&method=&revision=&version=1.0.0&side=consumer&check=false&timestamp=1530242060648 +14ms
  dubbo:zookeeper create Consumer finish +0ms
  dubbo:context new Context +0ms
  dubbo:context requestId#1 set application: { name: 'dubbo-node-consumer' } +0ms
  dubbo:context requestId#1 set methodName: sayHello +0ms
  dubbo:context requestId#1 set methodArgs: [ { '$class': 'java.lang.String', '$': 'test' } ] +0ms
  dubbo:context requestId#1 set dubboInterface: com.alibaba.dubbo.demo.DemoProvider +0ms
  dubbo:context requestId#1 set version: 1.0.0 +1ms
  dubbo:context requestId#1 set timeout: NaN +0ms
  dubbo:context requestId#1 set group:  +0ms
  dubbo:bootstrap middleware-> [ [AsyncFunction: handleRequest] ] +11s
  dubbo:bootstrap start middleware handle dubbo Request +0ms
  dubbo:context requestId#1 set resolve: [Function] +0ms
  dubbo:context requestId#1 set reject: [Function] +1ms
  dubbo:queue check timeout: ctx.timeout-> NaN @timeout: 5000 +11s
  dubbo:context requestId#1 set timeoutId +0ms
  dubbo:queue add queue,requestId#1, interface: com.alibaba.dubbo.demo.DemoProvider +0ms
  dubbo:queue current schedule queue => { '1': -1 } +0ms
  dubbo:scheduler handle requestId 1, current status: ready +11s
  dubbo:scheduler agentAddrSet-> [ '172.19.6.203:20880' ] +1ms
  dubbo:context requestId#1 set reject: 172.19.6.203 +1ms
  dubbo:context requestId#1 set invokePort: 20880 +0ms
  dubbo:zookeeper getProviderProps:|> [object Object] +11s
  dubbo:queue staring schedule 1#com.alibaba.dubbo.demo.DemoProvider#1.0.0 +2ms
  dubbo:socket-worker SocketWorker#1 =invoked=> 1 +11s
  dubbo:context requestId#1 set pid: 1 +1ms
  dubbo:hessian:encoderV2 dubbo encode param request:{
  "requestId": 1,
  "methodName": "sayHello",
  "methodArgs": [
    {
      "$class": "java.lang.String",
      "$": "test"
    }
  ],
  "dubboInterface": "com.alibaba.dubbo.demo.DemoProvider",
  "version": "1.0.0",
  "group": "",
  "dubboVersion": "2.5.7",
  "path": "com.alibaba.dubbo.demo.DemoProvider"
} +0ms
  dubbo:hessian:encoderV2 trace uuid->  +1ms
  dubbo:hessian:encoderV2 request#1 attachment {
  "$class": "java.util.HashMap",
  "$": {
    "path": "com.alibaba.dubbo.demo.DemoProvider",
    "interface": "com.alibaba.dubbo.demo.DemoProvider",
    "version": "1.0.0",
    "application": "dubbo-node-consumer"
  }
} +0ms
  dubbo:hessian:encoderV2 encode header requestId: 1 +1ms
  dubbo:hessian:encoderV2 encode body length: 219 bytes +0ms
  dubbo:queue current schedule queue ==> { '1': 1 } +2ms
  dubbo:socket-worker SocketWorker#1  =receive data=> 172.19.6.203:20880 +70ms
  dubbo:decode-buffer body length 57 +11s
  dubbo:hessian:DecoderV2 decode parse requestId: 1 +0ms
  dubbo:hessian:DecoderV2 parse response status: 20, DUBBO_RESPONSE_STATUS: OK +0ms
  dubbo:hessian:DecoderV2 parse dubbo response body flag: 1, DUBBO_RESPONSE_BODY_FLAG: RESPONSE_VALUE +1ms
  dubbo:socket-worker SocketWorker#1 <=received=> dubbo result { requestId: 1,
  dubbo:socket-worker   err: null,
  dubbo:socket-worker   res: 'Hello test, response form provider: 172.19.6.203:20880' } +2ms
  dubbo:queue resolve requestId#1, res: 'Hello test, response form provider: 172.19.6.203:20880' +70ms
  dubbo:queue clear invoke and schedule queue #1 +1ms
  dubbo:queue current schedule queue {} +0ms
  dubbo:queue invoke statistics==>{ timeoutErrCount: 0, paramCheckErrCount: 0, 'pid#1': 1 } +0ms
  dubbo:bootstrap end handle dubbo request +76ms
```

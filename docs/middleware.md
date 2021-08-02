---
id: middleware
title: Middleware
sidebar_label: Middleware
---

middleware 是很多 web 框架设计的非常好的一个扩展方案如 express, koa ,甚至前端的 Redux

它可以让我们的库聚焦于自身核心价值，又让系统获得了更好的可扩展性

很早之前我们想做 node 和 dubbo 的调用的日志跟踪，我们为了快速实现这个功能，将日志写在了模块内部，这样很不方便
有时候调整日志的格式都需要重新发布一个新的版本，而且可能会有其他类似的需求，会让我们的库变得臃肿，不可维护。

所以我们就快速的扩展出来中间件接口，供业务线可以扩展自己想要的插件，于是我们就讲 koa 的 middleware 的机制合入到我们库中。

## 一个小栗子

比如，我想知道每次 dubbo 调用的 costtime， 有没有很熟悉的感觉？

```typescript
const dubbo = new Dubbo({
  /*..各种参数..*/
})

dubbo.use(async (ctx, next) => {
  const startTime = Date.now()
  await next()
  const endTime = Date.now()
  console.log('costtime: %d', endTime - startTime)
})
```

在这个基础上我们去实现 node 和 dubbo 日志的跟踪就变得很简单了,可以从 ctx 中获取调用链路上各种参数。

## 一个更好玩的 dubbo-invoker

在 dubbo 的接口调用中，需要设置一些动态的参数如，version, group, timeout, retry 等常常

这些参数需要在 consumer 调用方才精确设定值，之前是在 interpret 翻译生成 ts 的代码里面进行设置这个不够灵活，所以这里面我就抽象一个 dubbo-invoker 作为设置参数的 middleware,这样可以很方便的动态设置各种 runtime 参数，还可以更优雅的干掉配置文件，😆😆😆

```sh
npm install dubbo-invoker
```

```javascript
import { dubboInvoker, matcher } from 'dubbo-invoker'

//init
const dubbo = Dubbo.from(/*....*/)

const matchRuler = matcher
  //精确匹配接口
  .service('com.alibaba.demo.UserProvider', {
    version: '1.0.0',
    group: 'user'
  })
  //service thunk
  .service((ctx) => {
    if (ctx.dubboInterface === 'com.alibaba.demo.ProductProvider') {
      ctx.version = '2.0.0'
      ctx.group = 'product-center'
      //通知dubboInvoker匹配成功
      return true
    }
  })
  //正则匹配
  .service(/^com.alibaba.dubbo/, {
    version: '2.0.0',
    group: ''
  })

dubbo.use(dubboInvoke(matchRuler))
```

<strong> 我想应该还有其他的花式玩法，㊗ ️😊 </strong>

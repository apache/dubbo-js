---
id: interpret
title: interpret
sidebar_label: Interpret
---

<img src="http://oss-hz.qianmi.com/x-site/dev/doc/dong/video2deal/xsite/interpret/鹦鹉.png" width = "100" alt="图片名称" align=center />

### Keep it Simple

我们坚定的认为开发体验同用户的体验同等重要，我们做了一些创新，一些很酷的实践。

为了使 node 和 dubbo 之间的调用像 java 调用 dubbo 一样简单透明，我们设计和实现了 [translator](./packages/interpret-cli).

通过分析 java 的 jar 包中的 bytecode 提取 dubbo 调用的接口信息，自动生成 typescript 类型定义文件以及调用的代码。

在 packages/dubbo/src/**tests**/provider 就是根据 java 目录下的 demo 翻译而来。

我们希望整个 dubbo 调用的代码都可以无缝生成。

**_职责_**

1.  翻译 Interface 代码,生成 node 端可调用代码;
2.  自动将参数转换为 hessian.js 能识别的对象;
3.  接口方法及参数类型提示;

## How to Usage?

如何把一个 dubbo 接口转换为 node 客户端能调用的代码,并在项目中使用呢?我们分为 3 个步骤:

1.  在 java 接口项目生成 jar 包及依赖文件;
2.  从生成的 jar 字节码中提取 ast 信息,翻译师根据 ast 信息生成 typescript;
3.  项目中调用生成代码;

注:

具体实现 参考文档 [dubbo2js-翻译师.pdf](https://github.com/hufeng/iThink/blob/master/talk/dubbo2js-%E7%BF%BB%E8%AF%91%E5%B8%88.pdf)

### step1:从 java 项目生成 jar

```sh
; 进入接口项目目录执行命令
mvn package
mvn install dependency:copy-dependencies
```

### step2:翻译生成 typescript 代码

```sh
npm install interpret-dubbo2js -g
interpret -c dubbo.json
```

dubbo.json:

```json
{
  "output": "./src",
  "entry": "com.qianmi",
  "entryJarPath": "${jarPath}",
  "libDirPath": "${denpendJarDir}"
}
```

| 参数名称     | 作用             |
| ------------ | ---------------- |
| output       | 生成代码保存路径 |
| entry        | 可选过滤无关代码 |
| entryJarPath | 接口的 jar 包    |
| libDirPath   | 接口所依赖的     |

**_Tip_** 生成的代码可以发 npm 包供其他业务线使用或直接在项目中引用

### step2:Use the provider

```typescript
import {ShowCaseProvider} from '@qianmi/***-api/lib/com/qianmi/ShowCaseProvider';

const service = {
  ShowCaseProvider,
};

const dubbo = new Dubbo({
  application: {name: 'node-dubbo'},
  register: app.config.zookeeper,
  service,
});

//main method
(async () => {
  //so easy
  await dubbo.service.ShowCaseProvider.show();
})();
``

**_Tip_** `npm install interpret-util apache-dubbo-js`;

[interpret-example](https://github.com/creasy2010/interpret-example);
```

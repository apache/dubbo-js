
Translator
-------

<img src="http://oss-hz.qianmi.com/x-site/dev/doc/dong/video2deal/xsite/interpret/鹦鹉.png" width = "100" alt="图片名称" align=center />

dubbo2.js打通了node与dubbo服务调用的rpc通道

调用dubbo接口时, 如果能自动生成接口定义,参数的转换,代码提示 开发体验会更优秀;

"Translator(翻译师)" 为此而生!


***职责***
1. 翻译Interface代码,生成node端可调用代码;
2. 自动将参数转换为hessian.js能识别的对象;
3. 接口方法及参数类型提示;

## TODO

- [ ] 接口注释信息未同步;
- [ ] mvn打包插件;

## How to Usage?
如何把一个dubbo接口转换为node客户端能调用的代码,并在项目中使用呢?我们分为3个步骤:

1. 在java接口项目生成jar包及依赖文件;
2. 从生成的jar字节码中提取ast信息,翻译师根据ast信息生成typescript;
3. 项目中调用生成代码;

注:

具体实现 参考文档 [dubbo2js-翻译师.pdf](https://github.com/dubbo/dubbo2.js/blob/master/ppt/dubbo2js-%E7%BF%BB%E8%AF%91%E5%B8%88.pdf)


### step1:从java项目生成jar

```shell
; 进入接口项目目录执行命令
mvn package
mvn install dependency:copy-dependencies
```


### step2:翻译生成typescript代码

```shell
npm install interpret-dubbo2js -g
interpret -c dubbo.json
```

dubbo.json:
```json
{
  "output": "./src",
  "entry":"com.qianmi",
  "entryJarPath":"${jarPath}",
  "libDirPath":"${denpendJarDir}"
}
```

| 参数名称  | 作用 |
| -------- | ---- |
| output  | 生成代码保存路径 |
| entry  | 可选过滤无关代码 |
| entryJarPath | 接口的jar包 |
| libDirPath | 接口所依赖的 |


***Tip*** 生成的代码可以发npm包供其他业务线使用或直接在项目中引用

### step2:Use the provider

```typescript
import {ShowCaseProvider} from '@qianmi/***-api/lib/com/qianmi/ShowCaseProvider';
const dubbo = new Dubbo({
    application: {name: 'd2p-visitor-bff'},
    dubboInvokeTimeout: 10,
    //zookeeper address
    register: app.config.zookeeper,
    dubboVersion: '2.4.13',
    logger: app.logger as ILogger,
    interfaces: [
      'com.qianmi.cloudshop.api.marketing.d2p.D2pMarketingQueryProvider'
    ],
  });
let showCaseProvider =  ShowCaseProvider(dubbo);
showCaseProvider.show();
```


***Tip***  `npm install interpret-util dubbo2.js`;

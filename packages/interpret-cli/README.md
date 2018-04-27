
## Translator

<img src="http://oss-hz.qianmi.com/x-site/dev/doc/dong/video2deal/xsite/interpret/鹦鹉.png" width = "100" alt="图片名称" align=center />


 Seamlessly connect to dubbo2.js to enhance the development experience!

## TODO

> remarks are not synchronized;

## Getting Started


### step1:Translating jar to typescript

1. `npm install interpret-dubbo2js -g`
2. `interpret -c dubbo.json`

dubbo.json:

```json
{
  "output": "./src",
  "dubboVersion": "1.0",
  "entry":"com.qianmi",
  "entryJarPath":"${jarPath}",
  "libDirPath":"${denpendJarDir}"
}
```


***Tip*** 生成的代码可以发npm包供其他业务线使用或直接在项目中引用

### step2:Use the provider

```typescript
import {D2pMarketingQueryProvider} from '@qianmi/d2p-cart-api/lib/com/qianmi/cloudshop/api/marketing/d2p/D2pMarketingQueryProvider';
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
let D2pMarketingQuery =  D2pMarketingQueryProvider(dubbo);

```


***Tip***  `npm install interpret-util dubbo2.js`;

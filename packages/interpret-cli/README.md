## Translator

<img src="http://oss-hz.qianmi.com/x-site/dev/doc/dong/video2deal/xsite/interpret/鹦鹉.png" width = "100" alt="图片名称" align=center />

dubbo2.js 打通了 node 与 dubbo 服务调用的 rpc 通道

调用 dubbo 接口时, 如果能自动生成接口定义,参数的转换,代码提示 开发体验会更优秀;

"Translator(翻译师)" 为此而生!!

**_职责_**

1.  翻译 Interface 代码,生成 node 端可调用代码;
2.  自动将参数转换为 hessian.js 能识别的对象;
3.  接口方法及参数类型提示;

## TODO

* [ ] Synchronization of interface annotation information;
* [ ] MVN packaged plug-in;

## How to Usage?

如何把一个 dubbo 接口转换为 node 客户端能调用的代码,并在项目中使用呢?我们分为 3 个步骤:

1.  在 java 接口项目生成 jar 包及依赖文件;
2.  从生成的 jar 字节码中提取 ast 信息,翻译师根据 ast 信息生成 typescript;
3.  项目中调用生成代码;

注:

具体实现 参考文档 [dubbo2js-翻译师.pdf](https://github.com/hufeng/iThink/blob/master/talk/dubbo2js-%E7%BF%BB%E8%AF%91%E5%B8%88.pdf)

### step1:从 java 项目生成 jar

```shell
; 进入接口项目目录执行命令
mvn package
mvn install dependency:copy-dependencies
```

### step2:翻译生成 typescript 代码

```shell
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
| output       | 生成代码保存路径 eg: [./app/dubbo/providers](../../hello-egg/dubbo.json) |
| entry        | 可选过滤无关代码 eg: [com.alibaba.dubbo.demo](../../hello-egg/dubbo.json) |
| entryJarPath | 接口的 jar 包 eg:[../../java/dubbo-demo/dubbo-demo-api/target/dubbo-demo-api-2.6.3.jar](../../hello-egg/dubbo.json)   |
| libDirPath   | 接口所依赖的   eg:  [../../java/dubbo-demo/dubbo-demo-api/target/dependency](../../hello-egg/dubbo.json)  |

**_Tip_** 生成的代码可以发 npm 包供其他业务线使用或直接在项目中引用

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
    'com.qianmi.cloudshop.api.marketing.d2p.D2pMarketingQueryProvider',
  ],
});
let showCaseProvider = ShowCaseProvider(dubbo);
showCaseProvider.show();
```

**_Tip_** `npm install interpret-util dubbo2.js`;

[interpret-example](https://github.com/creasy2010/interpret-example);




## vocabulary explanation

### Provider
There are two meanings.

First, Dubbo provides services interfaces, such as
```java

package com.alibaba.dubbo.demo;

public interface DemoProvider {

    String sayHello(String name);

    String echo() ;

    void test();

    UserResponse getUserInfo(UserRequest request);
}
```
Second,  the client for node.js, corresponding to the Dubbo service, such as

```typescript
import {UserRequest} from './UserRequest';
import {UserResponse} from './UserResponse';
import {argumentMap, JavaString} from 'interpret-util';
import {TDubboCallResult, Dubbo} from 'dubbo2.js';

export interface IDemoProvider {
  sayHello(name: JavaString): TDubboCallResult<string>;
  test(): TDubboCallResult<void>;
  echo(): TDubboCallResult<string>;
  getUserInfo(request: UserRequest): TDubboCallResult<UserResponse>;
}

export const DemoProviderWrapper = {
  sayHello: argumentMap,
  test: argumentMap,
  echo: argumentMap,
  getUserInfo: argumentMap,
};

export function DemoProvider(dubbo: Dubbo): IDemoProvider {
  return dubbo.proxyService<IDemoProvider>({
    dubboInterface: 'com.alibaba.dubbo.demo.DemoProvider',
    methods: DemoProviderWrapper,
  });
}

//generate by interpret-cli dubbo2.js
```

### converter
The main responsibility of a translator is to seamlessly connect with nodejs dubbo.

The main responsibility of the converter is to convert JavaScript code into JS objects in hession.JS format and then communicate with Dubbo service.

Let's see how it works:

[UserRequest.java](../../java/dubbo-demo/dubbo-demo-api/src/main/java/com/alibaba/dubbo/demo/UserRequest.java)
```java interface

//dubbo-demo/dubbo-demo-api/src/main/java/com/alibaba/dubbo/demo/DemoProvider.java
public interface DemoProvider {
    UserResponse getUserInfo(UserRequest request);
}

//dubbo-demo/dubbo-demo-api/src/main/java/com/alibaba/dubbo/demo/UserRequest.java
public class UserRequest implements Serializable {
    private Integer id;
    private String name;
    private String email;
}
```

Corresponding TS code

[UserRequest.ts](../../examples/hello-egg/app/dubbo/providers/com/alibaba/dubbo/demo/UserRequest.ts)
```typescript

//
import java from 'js-to-java';

//
export interface IUserRequest {
  name?: string;
  id?: number;
  email?: string;
}

export class UserRequest {
  constructor(params: IUserRequest) {
    this.name = params.name;
    this.id = params.id;
    this.email = params.email;
  }

  name?: string;
  id?: number;
  email?: string;

  __fields2java() {
    return {
      $class: 'com.alibaba.dubbo.demo.UserRequest',
      $: {
        name: java.String(this.name),
        id: java.Integer(this.id),
        email: java.String(this.email),
      },
    };
  }
}

//generate by interpret-cli dubbo2.js
```

### java Ast
Extract ast from Java source code and use it to convert to typescritp code

Let's look at the ast information for DemoProvider and UserRequest in the example above.

```json
{
  "classes":{

    "com.alibaba.dubbo.demo.DemoProvider":{
      "fields":{},
      "isAbstract":true,
      "isEnum":false,
      "isInterface":true,
      "methods":{
        "sayHello":{
          "formalParams":[
            "name"
          ],
          "isOverride":false,
          "params":[
            {
              "name":"java.lang.String",
              "typeArgs":[]
            }
          ],
          "ret":{
            "name":"java.lang.String",
            "typeArgs":[]
          },
          "typeParams":[]
        },
        "test":{
          "formalParams":[],
          "isOverride":false,
          "params":[],
          "ret":{
            "name":"java.lang.Void"
          },
          "typeParams":[]
        },
        "echo":{
          "formalParams":[],
          "isOverride":false,
          "params":[],
          "ret":{
            "name":"java.lang.String",
            "typeArgs":[]
          },
          "typeParams":[]
        },
        "getUserInfo":{
          "formalParams":[
            "request"
          ],
          "isOverride":false,
          "params":[
            {
              "name":"com.alibaba.dubbo.demo.UserRequest",
              "typeArgs":[]
            }
          ],
          "ret":{
            "name":"com.alibaba.dubbo.demo.UserResponse",
            "typeArgs":[]
          },
          "typeParams":[]
        }
      },
      "name":"com.alibaba.dubbo.demo.DemoProvider",
      "privateFields":[],
      "typeParams":[],
      "values":[]
    },
    "com.alibaba.dubbo.demo.UserRequest":{
      "fields":{
        "name":{
          "name":"java.lang.String",
          "typeArgs":[]
        },
        "id":{
          "name":"java.lang.Integer",
          "typeArgs":[]
        },
        "email":{
          "name":"java.lang.String",
          "typeArgs":[]
        }
      },
      "isAbstract":false,
      "isEnum":false,
      "isInterface":false,
      "methods":{
        "setName":{
          "formalParams":[
            "name"
          ],
          "isOverride":false,
          "params":[
            {
              "name":"java.lang.String",
              "typeArgs":[]
            }
          ],
          "ret":{
            "name":"java.lang.Void"
          },
          "typeParams":[]
        },
        "getName":{
          "formalParams":[],
          "isOverride":false,
          "params":[],
          "ret":{
            "name":"java.lang.String",
            "typeArgs":[]
          },
          "typeParams":[]
        },
        "setEmail":{
          "formalParams":[
            "email"
          ],
          "isOverride":false,
          "params":[
            {
              "name":"java.lang.String",
              "typeArgs":[]
            }
          ],
          "ret":{
            "name":"java.lang.Void"
          },
          "typeParams":[]
        },
        "setId":{
          "formalParams":[
            "id"
          ],
          "isOverride":false,
          "params":[
            {
              "name":"java.lang.Integer",
              "typeArgs":[]
            }
          ],
          "ret":{
            "name":"java.lang.Void"
          },
          "typeParams":[]
        },
        "getEmail":{
          "formalParams":[],
          "isOverride":false,
          "params":[],
          "ret":{
            "name":"java.lang.String",
            "typeArgs":[]
          },
          "typeParams":[]
        },
        "getId":{
          "formalParams":[],
          "isOverride":false,
          "params":[],
          "ret":{
            "name":"java.lang.Integer",
            "typeArgs":[]
          },
          "typeParams":[]
        },
        "toString":{
          "formalParams":[],
          "isOverride":false,
          "params":[],
          "ret":{
            "name":"java.lang.String",
            "typeArgs":[]
          },
          "typeParams":[]
        }
      },
      "name":"com.alibaba.dubbo.demo.UserRequest",
      "privateFields":[
        "id",
        "name",
        "email"
      ],
      "typeParams":[],
      "values":[]
    },
    "com.alibaba.dubbo.demo.UserResponse":{
      "fields":{
        "status":{
          "name":"java.lang.String",
          "typeArgs":[]
        },
        "info":{
          "name":"java.util.Map",
          "typeArgs":[{
            "isWildcard":false,
            "type":{
              "name":"java.lang.String",
              "typeArgs":[]
            }
          },{
            "isWildcard":false,
            "type":{
              "name":"java.lang.String",
              "typeArgs":[]
            }
          }]
        }
      },
      "isAbstract":false,
      "isEnum":false,
      "isInterface":false,
      "methods":{
        "getInfo":{
          "formalParams":[],
          "isOverride":false,
          "params":[],
          "ret":{
            "name":"java.util.Map",
            "typeArgs":[{
              "isWildcard":false,
              "type":{
                "name":"java.lang.String",
                "typeArgs":[]
              }
            },{
              "isWildcard":false,
              "type":{
                "name":"java.lang.String",
                "typeArgs":[]
              }
            }]
          },
          "typeParams":[]
        },
        "toString":{
          "formalParams":[],
          "isOverride":false,
          "params":[],
          "ret":{
            "name":"java.lang.String",
            "typeArgs":[]
          },
          "typeParams":[]
        },
        "setInfo":{
          "formalParams":[
            "info"
          ],
          "isOverride":false,
          "params":[
            {
              "name":"java.util.Map",
              "typeArgs":[{
                "isWildcard":false,
                "type":{
                  "name":"java.lang.String",
                  "typeArgs":[]
                }
              },{
                "isWildcard":false,
                "type":{
                  "name":"java.lang.String",
                  "typeArgs":[]
                }
              }]
            }
          ],
          "ret":{
            "name":"java.lang.Void"
          },
          "typeParams":[]
        },
        "getStatus":{
          "formalParams":[],
          "isOverride":false,
          "params":[],
          "ret":{
            "name":"java.lang.String",
            "typeArgs":[]
          },
          "typeParams":[]
        },
        "setStatus":{
          "formalParams":[
            "status"
          ],
          "isOverride":false,
          "params":[
            {
              "name":"java.lang.String",
              "typeArgs":[]
            }
          ],
          "ret":{
            "name":"java.lang.Void"
          },
          "typeParams":[]
        }
      },
      "name":"com.alibaba.dubbo.demo.UserResponse",
      "privateFields":[
        "status",
        "info"
      ],
      "typeParams":[],
      "values":[]
    }
  },
  "providers":[
    "com.alibaba.dubbo.demo.DemoProvider"
  ]
}

```




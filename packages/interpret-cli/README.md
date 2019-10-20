## Translator

<img src="http://oss-hz.qianmi.com/x-site/dev/doc/dong/video2deal/xsite/interpret/鹦鹉.png" width = "100" alt="图片名称" align=center />

Dubbo-js uses RPC to get through node and java.
If we can automatically generate Dubbo service interface definition, parameter conversion, and have automatic completion ability in ide, our development experience will be better.

"Translator" came into being for this purpose!

We will like it.

**_Duty_**

1.  Generate typescript code corresponding to Dubbo service interface;
2.  Parametric conversion, converting JavaScript object to a format that hession. JS recognizes;

## TODO

- [ ] Synchronization of interface annotation information;
- [ ] MVN packaged plug-in;

## How to Usage?

We divide the whole process into three steps.

1. Generate jar packages and install dependencies in Java API projects;

2. Extract ast information from generated jar bytecode, and then generate typescript based on it.

3. Calling services;

### step1:

```shell
mvn package
mvn install dependency:copy-dependencies
```

### step2:

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

note: [Reference examples](../../examples/hello-egg);

| parameter    | affect                                                                               |
| ------------ | ------------------------------------------------------------------------------------ |
| output       | the dir to save output eg: [config example](../../examples/hello-egg/dubbo.json)     |
| entry        | package path filter eg: [config example](../../examples/hello-egg/dubbo.json)        |
| entryJarPath | jar package for dubbo api eg: [config example](../../examples/hello-egg/dubbo.json)  |
| libDirPath   | the dubbo api dependencies eg: [config example](../../examples/hello-egg/dubbo.json) |

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

**_Tip_** `npm install interpret-util dubbo-js`;

[interpret-example](https://github.com/creasy2010/interpret-example);

## vocabulary explanation

Note: The code snippet in the following explanation comes from
[hello-egg-node](../../examples/hello-egg)

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

Second, the client for node.js, corresponding to the Dubbo service, such as

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

//generate by interpret-cli dubbo-js
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

//generate by interpret-cli dubbo-js
```

### java Ast

Extract ast from Java source code and use it to convert to typescritp code

Let's look at the ast information for DemoProvider and UserRequest in the example above.

```json
{
  "classes": {
    "com.alibaba.dubbo.demo.DemoProvider": {
      "fields": {},
      "isAbstract": true,
      "isEnum": false,
      "isInterface": true,
      "methods": {
        "sayHello": {
          "formalParams": ["name"],
          "isOverride": false,
          "params": [
            {
              "name": "java.lang.String",
              "typeArgs": []
            }
          ],
          "ret": {
            "name": "java.lang.String",
            "typeArgs": []
          },
          "typeParams": []
        },
        "test": {
          "formalParams": [],
          "isOverride": false,
          "params": [],
          "ret": {
            "name": "java.lang.Void"
          },
          "typeParams": []
        },
        "echo": {
          "formalParams": [],
          "isOverride": false,
          "params": [],
          "ret": {
            "name": "java.lang.String",
            "typeArgs": []
          },
          "typeParams": []
        },
        "getUserInfo": {
          "formalParams": ["request"],
          "isOverride": false,
          "params": [
            {
              "name": "com.alibaba.dubbo.demo.UserRequest",
              "typeArgs": []
            }
          ],
          "ret": {
            "name": "com.alibaba.dubbo.demo.UserResponse",
            "typeArgs": []
          },
          "typeParams": []
        }
      },
      "name": "com.alibaba.dubbo.demo.DemoProvider",
      "privateFields": [],
      "typeParams": [],
      "values": []
    },
    "com.alibaba.dubbo.demo.UserRequest": {
      "fields": {
        "name": {
          "name": "java.lang.String",
          "typeArgs": []
        },
        "id": {
          "name": "java.lang.Integer",
          "typeArgs": []
        },
        "email": {
          "name": "java.lang.String",
          "typeArgs": []
        }
      },
      "isAbstract": false,
      "isEnum": false,
      "isInterface": false,
      "methods": {
        "setName": {
          "formalParams": ["name"],
          "isOverride": false,
          "params": [
            {
              "name": "java.lang.String",
              "typeArgs": []
            }
          ],
          "ret": {
            "name": "java.lang.Void"
          },
          "typeParams": []
        },
        "getName": {
          "formalParams": [],
          "isOverride": false,
          "params": [],
          "ret": {
            "name": "java.lang.String",
            "typeArgs": []
          },
          "typeParams": []
        },
        "setEmail": {
          "formalParams": ["email"],
          "isOverride": false,
          "params": [
            {
              "name": "java.lang.String",
              "typeArgs": []
            }
          ],
          "ret": {
            "name": "java.lang.Void"
          },
          "typeParams": []
        },
        "setId": {
          "formalParams": ["id"],
          "isOverride": false,
          "params": [
            {
              "name": "java.lang.Integer",
              "typeArgs": []
            }
          ],
          "ret": {
            "name": "java.lang.Void"
          },
          "typeParams": []
        },
        "getEmail": {
          "formalParams": [],
          "isOverride": false,
          "params": [],
          "ret": {
            "name": "java.lang.String",
            "typeArgs": []
          },
          "typeParams": []
        },
        "getId": {
          "formalParams": [],
          "isOverride": false,
          "params": [],
          "ret": {
            "name": "java.lang.Integer",
            "typeArgs": []
          },
          "typeParams": []
        },
        "toString": {
          "formalParams": [],
          "isOverride": false,
          "params": [],
          "ret": {
            "name": "java.lang.String",
            "typeArgs": []
          },
          "typeParams": []
        }
      },
      "name": "com.alibaba.dubbo.demo.UserRequest",
      "privateFields": ["id", "name", "email"],
      "typeParams": [],
      "values": []
    },
    "com.alibaba.dubbo.demo.UserResponse": {
      "fields": {
        "status": {
          "name": "java.lang.String",
          "typeArgs": []
        },
        "info": {
          "name": "java.util.Map",
          "typeArgs": [
            {
              "isWildcard": false,
              "type": {
                "name": "java.lang.String",
                "typeArgs": []
              }
            },
            {
              "isWildcard": false,
              "type": {
                "name": "java.lang.String",
                "typeArgs": []
              }
            }
          ]
        }
      },
      "isAbstract": false,
      "isEnum": false,
      "isInterface": false,
      "methods": {
        "getInfo": {
          "formalParams": [],
          "isOverride": false,
          "params": [],
          "ret": {
            "name": "java.util.Map",
            "typeArgs": [
              {
                "isWildcard": false,
                "type": {
                  "name": "java.lang.String",
                  "typeArgs": []
                }
              },
              {
                "isWildcard": false,
                "type": {
                  "name": "java.lang.String",
                  "typeArgs": []
                }
              }
            ]
          },
          "typeParams": []
        },
        "toString": {
          "formalParams": [],
          "isOverride": false,
          "params": [],
          "ret": {
            "name": "java.lang.String",
            "typeArgs": []
          },
          "typeParams": []
        },
        "setInfo": {
          "formalParams": ["info"],
          "isOverride": false,
          "params": [
            {
              "name": "java.util.Map",
              "typeArgs": [
                {
                  "isWildcard": false,
                  "type": {
                    "name": "java.lang.String",
                    "typeArgs": []
                  }
                },
                {
                  "isWildcard": false,
                  "type": {
                    "name": "java.lang.String",
                    "typeArgs": []
                  }
                }
              ]
            }
          ],
          "ret": {
            "name": "java.lang.Void"
          },
          "typeParams": []
        },
        "getStatus": {
          "formalParams": [],
          "isOverride": false,
          "params": [],
          "ret": {
            "name": "java.lang.String",
            "typeArgs": []
          },
          "typeParams": []
        },
        "setStatus": {
          "formalParams": ["status"],
          "isOverride": false,
          "params": [
            {
              "name": "java.lang.String",
              "typeArgs": []
            }
          ],
          "ret": {
            "name": "java.lang.Void"
          },
          "typeParams": []
        }
      },
      "name": "com.alibaba.dubbo.demo.UserResponse",
      "privateFields": ["status", "info"],
      "typeParams": [],
      "values": []
    }
  },
  "providers": ["com.alibaba.dubbo.demo.DemoProvider"]
}
```

### argumentMap

ArgumentMap is a runtime assistant method whose main responsibility is to trigger data structure transformation.

Main steps:

1. Traversal parameters are called if \_fields 2java is included.

2. Delete null and undefined values;

```typescript
//Examples of argumentMap usage

import {UserRequest} from './UserRequest';
import {UserResponse} from './UserResponse';
import {argumentMap, JavaString} from 'interpret-util';
import {TDubboCallResult, Dubbo} from 'dubbo-js';

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

//generate by interpret-cli dubbo-js

//Content of argumentMap method
export function argumentMap() {
  let _arguments = Array.from(arguments);

  return _arguments.map(
    argumentItem =>
      argumentItem.__fields2java
        ? paramEnhance(argumentItem.__fields2java())
        : argumentItem,
  );
}

function paramEnhance(javaParams: Array<object> | object) {
  if (javaParams instanceof Array) {
    for (let i = 0, ilen = javaParams.length; i < ilen; i++) {
      let itemParam = javaParams[i];
      minusRedundancy(itemParam);
    }
  } else {
    minusRedundancy(javaParams);
  }
  return javaParams;
}

function minusRedundancy(itemParam: any) {
  if (!itemParam) {
    return;
  }
  for (var _key in itemParam.$) {
    if (itemParam.$[_key] === null || itemParam.$[_key] === undefined) {
      delete itemParam.$[_key];
      log('删除 key %s from %j ', itemParam, _key);
    }
  }
}
```

## FAQ:

### q1:How to integrate with the project?

There are two ways to use it.

1. Embedding projects directly;

2. Publish NPM packages;

The first approach is very suitable for a small number of Dubbo interfaces, single projects; see [hello-egg](../../examples/hello-egg/)

The second approach is suitable for large-scale projects, especially multi-project shared interfaces; see [Automatic Translation Service](https://github.com/creasy2010/auto-translator)

**_Tip_** 生成的代码可以发 npm 包供其他业务线使用或直接在项目中引用

## Resources

[dubbo-js-Translator.pdf](https://github.com/hufeng/iThink/blob/master/talk/dubbo2js-%E7%BF%BB%E8%AF%91%E5%B8%88.pdf)

[interpret-example](https://github.com/creasy2010/interpret-example);

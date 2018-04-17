/**
 * @desc
 *
 * @使用场景
 *
 * @company qianmi.com
 * @Date    2018/3/30
 **/

import {jType2Ts} from "../type-parse";
import {TypeInfoI} from "../../typings";

let beans = [];
let typeInfo: Map<string, TypeInfoI> = new Map();

describe("基本类型转换", () => {

  let typeOptions = {
    isTypeParam: typeName => {
      return false;
    },
    addDenpend: async (classPath: string) => {
      return
    },
    hasAst: (classPath: string) => {
      return beans.includes(classPath);
    },

    getTypeInfo: (classPath: string) => {
      if (typeInfo.has(classPath)) {
        return typeInfo.get(classPath);
      } else {
        return {
          isProvider: false, isClass: false, isEnum: false,
          classPath: "",
          packagePath: "",
          className: ""
        };
      }
    }
  }

  it('java.lang下的类型转换', async () => {

    let type = await jType2Ts({
      "isArray": false,
      "name": "java.lang.Integer"
    }, typeOptions);

    expect(type).toEqual("number");

  })


  it("map泛型二层转换", async () => {

    let type = await jType2Ts({
      "isArray": false,
      "name": "java.util.Map",
      "typeArgs": [{
        "isWildcard": false,
        "type": {
          "isArray": false,
          "name": "java.lang.String",
          "typeArgs": []
        }
      }, {
        "isWildcard": false,
        "type": {
          "isArray": false,
          "name": "java.util.List",
          "typeArgs": [{
            "isWildcard": false,
            "type": {
              "isArray": false,
              "name": "java.lang.String",
              "typeArgs": []
            }
          }]
        }
      }]
    }, typeOptions);
    expect(type).toMatchSnapshot();
  });

})


describe("数组类型转换", () => {

  it("基本数据类型转换", async () => {


  });
});
/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
  VariableDeclarationType,
  VariableStatementStructure,
} from 'ts-simple-ast';
import debug from 'debug';
import {IntepretHandle} from '../../handle';
import {IJClass} from '../../typings';
import {toMethod} from '../to-method';
import {jType2Ts} from "../../util/type-parse";
import {j2Jtj, mapParseContent} from "../bean/util/generic-transfer";

const log = debug('j2t:core:toWrapperClass');

const javaNativeConnection = [
  'java.util.Set',
  'java.util.Collection',
  'java.util.HashSet',
  'java.util.TreeSet',
  'java.util.LinkedHashSet',
  'java.util.List',
  'java.util.ArrayList',
  'java.util.LinkedList',
  'java.util.Vector',
];

const javaNativeMap = [
  'java.util.Map',
  'java.util.HashMap',
  'java.util.IdentityHashMap',
  'java.util.Hashtable',
  'java.util.LinkedHashMap',
  'java.util.TreeMap',
];

export async function toGenericWrapperClass(
    typeDef: IJClass,
    intepretHandle: IntepretHandle,
): Promise<VariableStatementStructure> {
  log('调用转换方法 toWrapperClass::');
  if (typeDef.isEnum) {
    //枚举类型的
    throw new Error('调用错误,枚举类型不应该有这个调用');
  } else {
    return toTypeWrapper(typeDef, intepretHandle);
  }
}

async function toTypeWrapper(
    typeDef: IJClass,
    intepretHandle: IntepretHandle,
): Promise<VariableStatementStructure> {
  let typeName = intepretHandle.getTypeInfo(typeDef.name).className;
  let _methods = [],
      bodys = [];
  for (let methodName in typeDef.methods) {
    let _methodName = methodName;
    if (typeDef.methods[methodName].isOverride) {
      methodName = methodName.substring(0, methodName.lastIndexOf('@override'));
    }

    if (_methods.indexOf(methodName) !== -1) {
      //重载的只处理一次.防止重载的方法
      continue;
    } else {
      _methods.push(methodName);
    }

    const auto = await autoConversion(methodName, typeDef, intepretHandle);
    bodys.push(`${auto}`);
  }

  return {
    isExported: true,
    declarationType: VariableDeclarationType.Const,
    declarations: [
      {
        name: typeName + 'Wrapper',
        initializer: `{${bodys.join(',')}}`,
      },
    ],
  };
}


async function autoConversion(
    methodName: string,
    typeDef: IJClass,
    intepretHandle: IntepretHandle,
): Promise<string> {

  let methodArgs = [];
  let methodArgs1 = [];

  let methodDef = typeDef.methods[methodName];

  let methodItem = await toMethod(methodName, methodDef, intepretHandle);

  for (var i = 0, iLen = methodDef.params.length; i < iLen; i++) {
    var paramItem = methodDef.params[i];
    if (paramItem.isArray) {
      if (TypeMap[paramItem.elementType.name]) {
        methodArgs1.push(`(Array.from(${methodItem.parameters[i].name}, x => java("${paramItem.elementType.name}" ,x)))`)
      } else {
        let astJava = intepretHandle.request.getAst(paramItem.elementType.name);
        if (astJava.isEnum) {
          // TODO
          methodArgs1.push(`java("${paramItem.elementType.name}", ${methodItem.parameters[i].name})`)
        } else {
          let packageName = paramItem.elementType.name.split('.');
          let name = packageName[packageName.length - 1];
          methodArgs1.push(`(Array.from(${methodItem.parameters[i].name}, x => new ${name}(x).__fields2java()))`);
        }
      }
    } else if (paramItem.typeArgs && paramItem.typeArgs.length > 0) {
      if (javaNativeConnection.includes(paramItem.name)) {
        if (javaNativeMap.includes(paramItem.typeArgs[0].type.name,)) {
          let forEachStr = `(${methodItem.parameters[i].name}||[])`;
          if (paramItem.name === 'Set') {
            forEachStr = `[... ${methodItem.parameters[i].name}]`;
          }
          methodArgs1.push(`java("${paramItem.name}",(${forEachStr}.map(paramItem=>{
                                ${mapParseContent('paramItemMapTransfer', 'paramItem', paramItem.typeArgs[0].type, intepretHandle)}
                            return paramItemMapTransfer;
                            })))`);
        } else {
          if (TypeMap[paramItem.typeArgs[0].type.name]) {
            methodArgs1.push(`java("${paramItem.name}" 
                        ,(Array.from(${methodItem.parameters[i].name}, x => java("${paramItem.typeArgs[0].type.name}" ,x))))`);
          } else {
            let packageName = paramItem.typeArgs[0].type.name.split('.');
            let name = packageName[packageName.length - 1];
            methodArgs1.push(`java("${paramItem.name}" ,(Array.from(${methodItem.parameters[i].name}, x => new ${name}(x).__fields2java())))`);
          }
        }
      } else if (javaNativeMap.includes(paramItem.name)) {
        let keyType, valType, initContent = '';

        keyType = jType2Ts(paramItem.typeArgs[0].type, intepretHandle);
        valType = jType2Ts(paramItem.typeArgs[1].type, intepretHandle);

        if (paramItem.typeArgs[1].type.typeArgs.length === 0) {
          //一级 Map<string,Request>
          initContent += `let ${methodItem.parameters[i].name}MapTransfer = new Map();
          for(let mapKey  in this.${methodItem.parameters[i].name}){
              ${methodItem.parameters[i].name}MapTransfer.set(${j2Jtj(intepretHandle, {
            paramRefName: `mapKey`,
            classPath: paramItem.typeArgs[0].type.name,
          })}, ${j2Jtj(intepretHandle, {
            paramRefName: `this.${methodItem.parameters[i].name}[mapKey]`,
            classPath: paramItem.typeArgs[1].type.name,
          })});
          };
          `;
        } else if (paramItem.typeArgs[1].type.typeArgs.length === 1) {
          //二级 Map<string,List<Request>>   Map<string,List<string>>  Map<string,List<Object>>
          if (
              javaNativeConnection.includes(paramItem.typeArgs[1].type.name)
          ) {
            initContent += `let ${methodItem.parameters[i].name}MapTransfer = new Map();
          for(let mapKey  in ${methodItem.parameters[i].name}) {
              ${methodItem.parameters[i].name}MapTransfer.set(${j2Jtj(intepretHandle, {
              paramRefName: `mapKey`,
              classPath: paramItem.typeArgs[0].type.name,
            })}, java.List(${methodItem.parameters[i].name}[mapKey].map(paramItem=>{
                    return ${j2Jtj(intepretHandle, {
              paramRefName: 'paramItem',
              classPath: paramItem.typeArgs[1].type.typeArgs[0].type.name,
            })}}))
             );
          };
          `;
          } else {
            throw new Error('泛型层级过深暂不支持;');
          }
        } else {
          throw new Error('泛型层级过深暂不支持;');
        }

        methodArgs1.push(
            `java("${paramItem.name}",(function () {${initContent} return ${methodItem.parameters[i].name}MapTransfer})())`,
        );
      } else {
        throw new Error(`暂不支持该类型转换${typeDef.name}.${name}`);
      }
    } else {
      if (TypeMap[paramItem.name]) {
        methodArgs1.push(`java("${paramItem.name}", ${methodItem.parameters[i].name})`);
      } else {
        let astJava = intepretHandle.request.getAst(paramItem.name);
        if (astJava.isEnum) {
          // 枚举暂时不支持
          methodArgs1.push(`java("${paramItem.name}", ${methodItem.parameters[i].name})`);
        }
        else {
          methodArgs1.push(`new ${methodItem.parameters[i].type}(${methodItem.parameters[i].name}).__fields2java()`);
        }
      }
    }

    methodArgs.push(`${methodItem.parameters[i].name}:${methodItem.parameters[i].type}`);
  }

  return `${methodName}:(${methodArgs.join(',')}) => {return [${methodArgs1.join(',')}]}`;

}

const TypeMap = {
  'java.lang.String': 'string',
  'java.lang.Object': 'Object',
  'java.lang.Integer': 'number',
  'java.lang.int': 'number',
  'java.lang.short': 'number',
  'java.lang.Short': 'number',
  'java.lang.long': 'number',
  'java.lang.Long': 'number',
  'java.lang.double': 'number',
  'java.lang.Double': 'number',
  'java.lang.Float': 'number',
  'java.lang.float': 'number',

  'java.lang.Void': 'void',
  'java.lang.Boolean': 'boolean',
  'java.lang.boolean': 'boolean',
  'java.lang.char': 'string',
  'java.lang.chars': 'string',
  'java.lang.Character': 'string',
  'java.lang.byte': 'byte',
  'java.lang.Byte': 'byte',

  'java.util.Set': 'Array',
  'java.util.HashSet': 'Array',
  'java.util.TreeSet': 'Array',
  'java.util.LinkedHashSet': 'Array',
  'java.util.List': 'Array',
  'java.util.Collection': 'Array',
  'java.util.ArrayList': 'Array',
  'java.util.LinkedList': 'Array',
  'java.util.Vector': 'Array',

  'java.util.Map': '{[name: ${nameType}]: ${value}}',
  'java.util.HashMap': '{[name: ${nameType}]: ${value}}',
  'java.util.TreeMap': '{[name: ${nameType}]: ${value}}',
  'java.util.LinkedHashMap': '{[name: ${nameType}]: ${value}}',
  'java.util.IdentityHashMap': '{[name: ${nameType}]: ${value}}',
  'java.util.Hashtable': '{[name: ${nameType}]: ${value}}',

  'java.util.Date': 'Date',
  'java.math.BigDecimal': '{value:string}',
};

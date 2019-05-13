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
  InterfaceDeclarationStructure,
  MethodSignatureStructure,
  PropertySignatureStructure,
} from 'ts-simple-ast';

import debug from 'debug';
import {toField} from '../bean/to-field';
import {IJClass} from '../../typings';
import {toMethod} from '../to-method';
import {IntepretHandle} from '../../handle';

const log = debug('j2t:core:toInterface');

export async function toGenericInterface(
    typeDef: IJClass,
    intepretHandle: IntepretHandle,
): Promise<InterfaceDeclarationStructure> {
  log('调用转换方法 toInterface::');
  let methods: MethodSignatureStructure[] = [];
  let properties: PropertySignatureStructure[] = [];

  for (let fieldName in typeDef.fields) {
    properties.push(
        await toField(fieldName, typeDef.fields[fieldName], intepretHandle),
    );
  }

  let filtersMethodNames = genePropsGetSet(properties.map(({name}) => name));

  log('添加过滤方法:: %j', filtersMethodNames);

  for (let methodName in typeDef.methods) {
    if (filtersMethodNames.includes(methodName)) {
      continue;
    }
    let _methodName =methodName;

    if (typeDef.methods[methodName].isOverride) {
      console.log('文件是override类型::',typeDef.name,methodName);
      _methodName = methodName.substring(0, methodName.lastIndexOf('@override'));
    }

    let methodItem = await toMethod(
        _methodName,
        typeDef.methods[methodName],
        intepretHandle,
    );

    //如果是基本类型, 生成typescript的类型与js-to-java类型相对应 javaXXX;
    let methodDef = typeDef.methods[methodName];

    for (var i = 0, iLen = methodDef.params.length; i < iLen; i++) {
      var paramItem = methodDef.params[i];
      if (paramItem.isArray) {
        if (TypeMap[paramItem.elementType.name]) {
          methodItem.parameters[i].type = TypeMap[paramItem.elementType.name] + '[]';
        } else if (intepretHandle.request.hasAst(paramItem.elementType.name)) {
          let isEnum = intepretHandle.request.hasAst(paramItem.elementType.name) && intepretHandle.request.getAst(paramItem.elementType.name).isEnum;
          if (!isEnum) {
            methodItem.parameters[i].type = 'any[]';
          }
        }
      } else {
        if (TypeMap[paramItem.name]) {
          methodItem.parameters[i].type = TypeMap[paramItem.name];
        } else {
          let isEnum = intepretHandle.request.hasAst(paramItem.name) && intepretHandle.request.getAst(paramItem.name).isEnum;
          if (!isEnum) {
            methodItem.parameters[i].type = 'object';
          }
        }
      }
    }
    methods.push(methodItem);
  }

  log('转换 名称::%s 属性 :%j  方法:%j', typeDef.name, properties, methods);

  return {
    name: 'I' + intepretHandle.getTypeInfo(typeDef.name).className,
    isExported: true,
    methods,
    properties,
  };
}

export function genePropsGetSet(propsNames: string[]) {
  let filtersMethodNames = [];
  propsNames.forEach(name => {
    if (name.startsWith('is')) {
      filtersMethodNames.push(name);
      filtersMethodNames.push(name.replace('is', 'set'));
    } else {
      let _methodName = name.charAt(0).toUpperCase() + name.slice(1);
      filtersMethodNames.push('set' + _methodName);
      filtersMethodNames.push('get' + _methodName);
    }
  });
  return filtersMethodNames;
}

const TypeMap = {
  'java.lang.Boolean': 'boolean',
  boolean: 'boolean',
  'java.lang.Integer': 'number',
  int: 'number',
  short: 'number',
  'java.lang.Short': 'number',
  byte: 'object',
  'java.lang.Byte': 'object',
  long: 'number',
  'java.lang.Long': 'number',
  double: 'number',
  'java.lang.Double': 'number',
  float: 'number',
  'java.lang.Float': 'number',
  'java.lang.String': 'string',
  char: 'string',
  'java.lang.Character': 'string',
  'java.util.List': 'any[]',
  'java.util.Set': 'any[]',
  'java.util.HashMap': 'object',
  'java.util.Map': 'object',
  'java.util.ArrayList': 'any[]',
  'java.util.HashSet': 'any[]',
  'java.util.Collection': 'any[]',
  'java.util.LinkedHashSet': 'any[]',
  'java.util.LinkedList': 'any[]',
};
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

export async function toInterface(
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

  //add extra javaType declare;
  let extraImport: string[] = ['argumentMap'];
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
          methodItem.parameters[i].type =
            TypeMap[paramItem.elementType.name] + '[]';
          if (!extraImport.includes(TypeMap[paramItem.elementType.name])) {
            extraImport.push(TypeMap[paramItem.elementType.name]);
          }
        }
      } else {
        if (TypeMap[paramItem.name]) {
          methodItem.parameters[i].type = TypeMap[paramItem.name];
          if (!extraImport.includes(TypeMap[paramItem.name])) {
            extraImport.push(TypeMap[paramItem.name]);
          }
        }
      }
    }
    methods.push(methodItem);
  }

  intepretHandle.sourceFile.addImport({
    moduleSpecifier: 'interpret-util',
    defaultImport: `{${extraImport.join(',')}}`,
  });

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
  'java.lang.Boolean': 'JavaBoolean',
  boolean: 'JavaBoolean',
  'java.lang.Integer': 'JavaInteger',
  int: 'Javaint',
  short: 'Javashort',
  'java.lang.Short': 'JavaShort',
  byte: 'Javabyte',
  'java.lang.Byte': 'JavaByte',
  long: 'Javalong',
  'java.lang.Long': 'JavaLong',
  double: 'Javadouble',
  'java.lang.Double': 'JavaDouble',
  float: 'Javafloat',
  'java.lang.Float': 'JavaFloat',
  'java.lang.String': 'JavaString',
  char: 'Javachar',
  'java.lang.Character': 'bbbbb',
  'java.util.List': 'JavaList',
  'java.util.Set': 'JavaSet',
  'java.util.HashMap': 'JavaHashMap',
  'java.util.Map': 'JavaMap',
};

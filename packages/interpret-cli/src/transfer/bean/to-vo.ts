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
import debug from 'debug';
import {
  ClassDeclarationStructure,
  InterfaceDeclarationStructure,
  MethodDeclarationStructure,
  ParameterDeclarationStructure,
  PropertyDeclarationStructure,
  TypeParameterDeclarationStructure,
} from 'ts-simple-ast';
import {IntepretHandle} from '../../handle';
import {IJClass} from '../../typings';
import {jType2Ts} from '../../util/type-parse';
import {toField} from './to-field';
import {fields2CtrContent, getCtorParaStr} from './util/transfer';

const log = debug('j2t:core:toBeanClass');

/**
 * java接口转换为ts接口ast
 * @param typeDef
 * @returns {InterfaceDeclarationStructure}
 */
export async function toBeanClass(
  typeDef: IJClass,
  intepretHandle: IntepretHandle,
): Promise<ClassDeclarationStructure> {
  log('调用转换方法 toBeanClass::');
  let typeName = intepretHandle.getTypeInfo(typeDef.name).className;
  let typeParameters: TypeParameterDeclarationStructure[] = [];

  if (typeDef.typeParams) {
    typeDef.typeParams.forEach(typeParamsItem => {
      typeParameters.push({
        name: typeParamsItem.name + ' extends { __fields2java?(): any } = any',
      });
    });
  }
  //获取 方法定义; 或者获取属性定义
  let methods: Array<MethodDeclarationStructure> = [],
    properties: Array<PropertyDeclarationStructure> = [],
    ctorParams: ParameterDeclarationStructure[] = [];

  //1.1 找到实例中的相关参数及类型
  let fileds = [];
  for (var fieldName in typeDef.fields) {
    //有些字段类型为org.slf4j.Logger等信息;;;我们要转化的应该只是
    let filedType = typeDef.fields[fieldName].name;
    if (typeDef.fields[fieldName].isArray) {
      filedType = typeDef.fields[fieldName].elementType.name;
    }
    const regex = new RegExp(
      `^(get|set)${fieldName[0].toUpperCase()}${fieldName.slice(1)}$`,
    );
    if (
      typeDef.privateFields.indexOf(fieldName) !== -1 && // 在privateField中
      Object.keys(typeDef.methods || {}).findIndex(n => regex.test(n)) === -1 // 并且没有getter和setter
    ) {
      continue; // 跳过不翻译
    }

    let field = await toField(
      fieldName,
      typeDef.fields[fieldName],
      intepretHandle,
    );
    properties.push(field);
    ctorParams.push({name: field.name, type: field.type});

    let filedItem = typeDef.fields[fieldName];
    fileds.push({
      name: fieldName,
      type: await jType2Ts(filedItem, intepretHandle),
      filedAst: filedItem,
    });
  }
  //添加构造函数入参interface
  //1.2 生成方法;;
  let {fieldTrans, initContent} = await fields2CtrContent(
    fileds,
    intepretHandle,
    typeDef,
  );

  let bodyText = `${initContent ? initContent + ';' : ''}
      return {
            $class: '${typeDef.name}', 
            $: {${fieldTrans.join(',')}}
      }`;

  try {
    intepretHandle.sourceFile.addInterface({
      typeParameters,
      isExported: true,
      name: 'I' + typeName,
      properties,
    });
  } catch (err) {
    console.error(`为${intepretHandle.classPath}添加Interface出错,${err}`);
  }

  methods.push({name: '__fields2java', bodyText});
  let ctorBody = ctorParams
    .map(({name}) => `this.${name}=params.${name};`)
    .join('\n');

  return {
    name: typeName,
    ctor: {
      parameters: [
        {
          name: `params:${getCtorParaStr(typeName, typeParameters)}`,
        },
      ],
      bodyText: ctorBody,
    },
    typeParameters,
    properties,
    isExported: true,
    methods,
  };
}

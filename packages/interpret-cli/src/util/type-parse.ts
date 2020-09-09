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
import {IJFieldPropers, ITypePropers, ITypeSearch} from '../typings';

const log = debug('j2t:core:ast-parse-util');

/**
 * java 类型映射到TS中的值;;
 * @type {{String: string; Integer: string; Integer: string}}
 *
 * eg:
 *
 *
 */
const javaType2JSMap = {
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
  'java.util.LinkedHashSet': 'Array',
  'java.util.List': 'Array',
  'java.util.Collection': 'Array',
  'java.util.Date': 'Date',
  'java.util.Map': '{[name: ${nameType}]: ${value}}',
  'java.util.HashMap': '{[name: ${nameType}]: ${value}}',
  'java.math.BigDecimal': '{value:string}',
};

/**
 * 获取field的类型转换eg:
 * java.lang.String=>string;
 * java.util.List<String>=>string[];
 *
 * @param {IJFieldPropers} typePropers
 * @param {ITypeSearch} typeOptions
 * @returns {string}
 */
export async function jType2Ts(
  typePropers: ITypePropers,
  typeOptions: ITypeSearch,
): Promise<string> {
  let result = '';
  //是否是类泛型的定义
  if (!typePropers) {
    throw new Error('typePropers为空');
  }

  if (typeOptions.isTypeParam(typePropers.name)) {
    return typePropers.name;
  } else if (typePropers.isArray) {
    let subType = await jType2Ts(typePropers.elementType, typeOptions);
    return `${subType}[]`;
  } else if (typePropers.name === 'java.lang.Enum') {
    //枚举类型处理
    let enumClassPath = typePropers.typeArgs[0].type.name;
    return classPath2TypeName(enumClassPath, typeOptions);
  } else if (
    typePropers.name === 'java.util.Map' &&
    typePropers.typeArgs.length === 0
  ) {
    return 'any'; //直接返回any
  } else if (typePropers.typeArgs && typePropers.typeArgs.length > 0) {
    //泛型处理
    let type = await classPath2TypeName(typePropers.name, typeOptions);
    if (typePropers.name === 'java.util.Map') {
      let nameType = 'any';
      if (typePropers.typeArgs[0]) {
        if (!typePropers.typeArgs[0].isWildcard) {
          nameType = await jType2Ts(typePropers.typeArgs[0].type, typeOptions);
        }
      }

      let valueType = 'any';
      if (typePropers.typeArgs[1]) {
        if (!typePropers.typeArgs[1].isWildcard) {
          valueType = await jType2Ts(typePropers.typeArgs[1].type, typeOptions);
        }
      }

      result = type
        .replace('${nameType}', nameType)
        .replace('${value}', valueType);
    } else if (type === 'any') {
      return 'any';
    } else {
      let subTypes = [];
      for (var i = 0, iLen = typePropers.typeArgs.length; i < iLen; i++) {
        var subItem = typePropers.typeArgs[i];

        if (!subItem.isWildcard) {
          subTypes.push(await jType2Ts(subItem.type, typeOptions));
        } else {
          subTypes.push('any');
        }
      }
      result = `${type}<${subTypes.join(',')}>`;
    }
  } else {
    result = await classPath2TypeName(typePropers.name, typeOptions);
  }

  log('获取变量的类型:', typePropers, '==>', result);
  return result;
}

/**
 * 通过java类路径找到typescript中相对应的文件
 * 策略, 先从基础类型中找,如果找不到从环境中找.再找不到抛错;
 * eg:
 *    java.lang.String => string,
 *    java.util.Date => Date,
 *    java.util.Map => {[name: ${nameType}]: ${value}},
 *    java.util.HashMap => {[name: ${nameType}]: ${value}},
 *    java.math.BigDecimal => {value:string}
 *
 *    com.qianmi.pc.api.d2c.item.pojo.D2cGoodsSort => D2cGoodsSort
 *
 */
export async function classPath2TypeName(
  classPath: string,
  typeOptions: ITypeSearch,
): Promise<string> {
  let result = javaType2JSMap[classPath];
  if (result) {
    return result;
  } else if (typeOptions.hasAst(classPath)) {
    let denpendItem = await typeOptions.addDenpend(classPath);
    if (denpendItem) {
      return denpendItem.importName;
    } else {
      console.warn('warning: not find class Type for :' + classPath);
      return 'any';
    }
  } else {
    return 'any';
    // throw new Error(`未找到类${classPath},在typescript中的信息; `);
  }
}

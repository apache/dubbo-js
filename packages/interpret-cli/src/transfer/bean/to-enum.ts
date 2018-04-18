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
import {EnumDeclarationStructure} from 'ts-simple-ast';
import {IntepretHandle} from '../../handle';
import {IJClass} from '../../typings';

const log = debug('j2t:core:toField');

/**
 * 枚举类型转换;
 * @param enumDef
 * @returns {EnumDeclarationStructure}
 */
export function toEnum(
  className: string,
  enumDef: IJClass,
  intepretHandle: IntepretHandle,
): EnumDeclarationStructure {
  log('转换 为枚举:%o', enumDef);

  let members = [],
    paramNmu = 0,
    fieldIndex = 0;
  for (var fieldsKey in enumDef.fields) {
    if (enumDef.fields[fieldsKey].name === className) {
      let initializer = `"${fieldsKey}"`,
        values = intepretHandle.astJava.values || [];

      if (typeof values[fieldIndex] === 'number') {
        initializer = `${values[fieldIndex]}`;
      }

      members.push({
        name: fieldsKey,
        initializer,
      });
      fieldIndex++;
    } else {
      paramNmu++;
    }
  }

  console.warn(
    'warning:调用转换方法 toEnum::',
    className,
    '参数数量:',
    paramNmu,
    ' 联系相关接口开发人员,尽量不要使用枚举类型',
  );
  return {
    isExported: true,
    name: intepretHandle.getTypeInfo(className).className,
    members,
  };
}

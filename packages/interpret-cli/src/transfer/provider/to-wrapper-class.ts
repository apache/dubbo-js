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

const log = debug('j2t:core:toWrapperClass');

export function toWrapperClass(
  typeDef: IJClass,
  intepretHandle: IntepretHandle,
): VariableStatementStructure {
  log('调用转换方法 toWrapperClass::');
  if (typeDef.isEnum) {
    //枚举类型的
    throw new Error('调用错误,枚举类型不应该有这个调用');
  } else {
    return toTypeWrapper(typeDef, intepretHandle);
  }
}

function toTypeWrapper(
  typeDef: IJClass,
  intepretHandle: IntepretHandle,
): VariableStatementStructure {
  let typeName = intepretHandle.getTypeInfo(typeDef.name).className;
  let _methods = [],
    bodys = [];
  for (let methodName in typeDef.methods) {
    if (typeDef.methods[methodName].isOverride) {
      methodName = methodName.substring(0, methodName.lastIndexOf('@override'));
    }

    if (_methods.indexOf(methodName) !== -1) {
      //重载的只处理一次.防止重载的方法
      continue;
    } else {
      _methods.push(methodName);
    }
    bodys.push(`${methodName}:argumentMap`);
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

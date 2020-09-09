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
import {MethodSignatureStructure} from 'ts-simple-ast';
import {IntepretHandle} from '../handle';
import {IJMethodPropers} from '../typings';
import {jType2Ts} from '../util/type-parse';

const log = debug('j2t:core:toMethod');

/**
 * java方法转换为typescript method-ast ;
 * @param methodDef
 * @returns {MethodSignatureStructure}
 */
export async function toMethod(
  methodName: string,
  methodDef: IJMethodPropers,
  intepretHandle: IntepretHandle,
): Promise<MethodSignatureStructure> {
  log('调用转换方法 toMethod::', methodName, methodDef);
  let parameters = [];
  for (var i = 0, iLen = methodDef.params.length; i < iLen; i++) {
    var paramItem = methodDef.params[i];
    if (paramItem.isArray) {
      let type = await jType2Ts(paramItem.elementType, intepretHandle);
      let name =
        (methodDef.formalParams && methodDef.formalParams[i]) ||
        paramItem.elementType.name.substring(
          paramItem.elementType.name.lastIndexOf('.') + 1,
        ) + i;
      parameters.push({
        name,
        type: type + '[]',
      });
    } else {
      let type = await jType2Ts(paramItem, intepretHandle);
      let name =
        (methodDef.formalParams && methodDef.formalParams[i]) ||
        paramItem.name.substring(paramItem.name.lastIndexOf('.') + 1) + i;
      parameters.push({
        name,
        type,
      });
    }
  }

  let returnType = await jType2Ts(methodDef.ret, intepretHandle);

  return {
    name: methodName,
    parameters,
    returnType: `TDubboCallResult<${returnType}>`,
  };
}

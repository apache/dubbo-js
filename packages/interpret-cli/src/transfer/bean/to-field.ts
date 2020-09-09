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
import {PropertySignatureStructure} from 'ts-simple-ast';
import {IntepretHandle} from '../../handle';
import {IJFieldPropers} from '../../typings';
import {jType2Ts} from '../../util/type-parse';

const log = debug('j2t:core:toField');

/**
 * 对象的field转换;  ast
 *
 * @param fieldDef
 * @returns {PropertySignatureStructure}
 */
export async function toField(
  fieldName: string,
  fieldProps: IJFieldPropers,
  intepretHandle: IntepretHandle,
): Promise<PropertySignatureStructure> {
  log('转换 %s 为属性:%o', fieldName, fieldProps);

  let type = await jType2Ts(fieldProps, intepretHandle);
  return {
    name: fieldName,
    hasQuestionToken: true,
    type,
  };
}

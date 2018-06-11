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

const log = debug('j2t:core:paramEnhance');

export function argumentMap() {
  let _arguments = Array.from(arguments);

  return _arguments.map(
    argumentItem =>
      argumentItem.__fields2java
        ? paramEnhance(argumentItem.__fields2java())
        : argumentItem,
  );
}

//删除对象中包含undefined 与null的值情况
function paramEnhance(javaParams: Array<object> | object) {
  if (javaParams instanceof Array) {
    for (let i = 0, ilen = javaParams.length; i < ilen; i++) {
      let itemParam = javaParams[i];
      minusRedundancy(itemParam);
    }
  } else {
    minusRedundancy(javaParams);
  }
  return javaParams;
}

function minusRedundancy(itemParam: any) {
  if (!itemParam) {
    return;
  }
  for (var _key in itemParam.$) {
    if (itemParam.$[_key] === null || itemParam.$[_key] === undefined) {
      delete itemParam.$[_key];
      log('删除 key %s from %j ', itemParam, _key);
    }
  }
}

export type JavaString = Object;
export type JavaBoolean = Object;
export type Javaboolean = Object;
export type JavaInteger = Object;
export type Javaint = Object;
export type JavaShort = Object;
export type Javashort = Object;
export type Javabyte = Object;
export type JavaByte = Object;
export type JavaLong = Object;
export type Javalong = Object;
export type Javadouble = Object;
export type JavaDouble = Object;
export type Javafloat = Object;
export type JavaFloat = Object;
export type Javachar = Object;
export type Javachars = Object;
export type JavaList = Object;
export type JavaSet = Object;
export type JavaHashMap = Object;
export type JavaMap = Object;

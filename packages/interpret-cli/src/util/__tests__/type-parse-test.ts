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
import {jType2Ts} from '../type-parse';
import {TypeInfoI} from '../../typings';

let beans = [];
let typeInfo: Map<string, TypeInfoI> = new Map();

describe('基本类型转换', () => {
  let typeOptions = {
    isTypeParam: typeName => {
      return false;
    },
    addDenpend: async (classPath: string) => {
      return;
    },
    hasAst: (classPath: string) => {
      return beans.includes(classPath);
    },

    getTypeInfo: (classPath: string) => {
      if (typeInfo.has(classPath)) {
        return typeInfo.get(classPath);
      } else {
        return {
          isProvider: false,
          isClass: false,
          isEnum: false,
          classPath: '',
          packagePath: '',
          className: '',
        };
      }
    },
  };

  it('java.lang下的类型转换', async () => {
    let type = await jType2Ts(
      {
        isArray: false,
        name: 'java.lang.Integer',
      },
      typeOptions,
    );

    expect(type).toEqual('number');
  });

  it('map泛型二层转换', async () => {
    let type = await jType2Ts(
      {
        isArray: false,
        name: 'java.util.Map',
        typeArgs: [
          {
            isWildcard: false,
            type: {
              isArray: false,
              name: 'java.lang.String',
              typeArgs: [],
            },
          },
          {
            isWildcard: false,
            type: {
              isArray: false,
              name: 'java.util.List',
              typeArgs: [
                {
                  isWildcard: false,
                  type: {
                    isArray: false,
                    name: 'java.lang.String',
                    typeArgs: [],
                  },
                },
              ],
            },
          },
        ],
      },
      typeOptions,
    );
    expect(type).toMatchSnapshot();
  });
});

describe('数组类型转换', () => {
  it('基本数据类型转换', async () => {
  });
});

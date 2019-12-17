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
import {TypeInfoI} from '../../typings';
import {jType2Ts} from '../type-parse';

let beans = ['com.qianmi.gavin.comm.Phone'];
let typeInfo: Map<string, TypeInfoI> = new Map();
typeInfo.set('com.qianmi.gavin.comm.Phone', {
  classPath: 'com.qianmi.gavin.comm.Phone',
  packagePath: 'com.qianmi.gavin.comm',
  className: 'Phone',
  isProvider: false,
  isClass: false,
  isEnum: true,
});

describe('基本类型转换', () => {
  let typeOptions = {
    isTypeParam: typeName => {
      return false;
    },
    addDenpend: async (classPath: string) => {
      let _typeInfo = typeInfo.get(classPath);
      return {
        classPath: _typeInfo.classPath,
        name: _typeInfo.className,
        importName: _typeInfo.className,
      };
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

  it('枚举Enum<Phone>类型转换', async () => {
    let type = await jType2Ts(
      {
        name: 'java.lang.Enum',
        typeArgs: [
          {
            isWildcard: false,
            type: {
              name: 'com.qianmi.gavin.comm.Phone',
              typeArgs: [],
            },
          },
        ],
      },
      typeOptions,
    );
    expect(type).toEqual('Phone');
  });

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
  it('基本数据类型转换', async () => {});
});

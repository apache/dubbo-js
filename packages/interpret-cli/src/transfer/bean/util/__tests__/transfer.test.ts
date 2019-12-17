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
import {TypeInfoI} from '../../../../typings';
import {fields2CtrContent, getCtorParaStr, j2Jtj} from '../transfer';

/**
 * @desc
 *
 * @使用场景
 *
 * @company qianmi.com
 * @Date    2018/4/8
 **/

let enums = [
    'com.qianmi.yxtc.enums.BusiTypeEnum',
    'com.qianmi.gavin.comm.Phone',
  ],
  beans = ['com.qianmi.yxtc.domain.PayMethodInfo'];
let typeInfo: Map<string, TypeInfoI> = new Map();

enums.forEach(item => {
  typeInfo.set(item, {
    classPath: item,
    className: item.substring(item.lastIndexOf('.') + 1),
    packagePath: item.substring(0, item.lastIndexOf('.')),
    isProvider: false,
    isClass: false,
    isEnum: true,
    typeParameters: [],
  });
});

beans.forEach(item => {
  typeInfo.set(item, {
    classPath: item,
    className: item.substring(item.lastIndexOf('.') + 1),
    packagePath: item.substring(0, item.lastIndexOf('.')),
    isProvider: false,
    isClass: true,
    isEnum: false,
    typeParameters: [],
  });
});

let typeOptions = {
  isTypeParam: typeName => {
    return ['T'].includes(typeName);
  },
  hasAst: (classPath: string) => {
    return enums.includes(classPath) || beans.includes(classPath);
  },
  addDenpend: async (classPath: string) => {
    return {
      classPath: '',
      name: '',
      importName: '',
    };
  },
  getTypeInfo: (classPath: string) => {
    if (typeInfo.has(classPath)) {
      return typeInfo.get(classPath);
    } else {
      return {
        classPath: '',
        packagePath: '',
        className: '',
        isProvider: false,
        isClass: false,
        isEnum: false,
      };
    }
  },
};

describe('构造函数生成', () => {
  it('无泛型参数的', async () => {
    let content = getCtorParaStr('ItemCreateRequest');
    expect(content).toEqual('IItemCreateRequest');
  });

  it('有多个泛型参数的', async () => {
    let content = getCtorParaStr('ItemCreateRequest', [
      {
        name: 'T',
      },
      {
        name: 'W',
      },
    ]);
    expect(content).toEqual('IItemCreateRequest<T,W>');
  });
});

describe('基础转换生成', () => {
  it('枚举类型', async () => {
    let content = j2Jtj(typeOptions, {
      paramRefName: 'item',
      classPath: 'com.qianmi.yxtc.enums.BusiTypeEnum',
    });
    expect(content).toMatchSnapshot();
  });

  it('对象类型', async () => {
    let content = j2Jtj(typeOptions, {
      paramRefName: 'item',
      classPath: 'com.qianmi.yxtc.domain.PayMethodInfo',
    });
    expect(content).toEqual('item?item.__fields2java():null');
  });

  it('泛型对象类型', async () => {
    let content = j2Jtj(typeOptions, {
      paramRefName: 'item',
      classPath: 'T',
    });
    expect(content).toEqual(
      "(item&&item['__fields2java'])?item['__fields2java']():item",
    );
  });

  it('时间类型', async () => {
    let content = j2Jtj(typeOptions, {
      paramRefName: 'item',
      classPath: 'java.util.Date',
    });
    expect(content).toEqual('item');
  });

  it('java.lang.类型', async () => {
    let content = j2Jtj(typeOptions, {
      paramRefName: 'item',
      classPath: 'java.lang.String',
    });
    expect(content).toEqual('java.String(item)');
  });

  it('bigDecimal.类型', async () => {
    let content = j2Jtj(typeOptions, {
      paramRefName: 'this.initPrice',
      classPath: 'java.math.BigDecimal',
    });
    expect(content).toEqual(
      'this.initPrice?java.BigDecimal(this.initPrice.value):null',
    );
  });
});

describe('集合显示问题 ', () => {
  it('java.util.Collection', async () => {
    let {fieldTrans, initContent} = await fields2CtrContent(
      [
        {
          name: 'skuIds',
          filedAst: typeDef.fields.skuIds,
        },
      ],
      typeOptions,
      typeDef,
    );
    expect(initContent).toMatchSnapshot();
    expect(fieldTrans.join(',')).toMatchSnapshot();
  });
});

describe('数组显示问题 string[]', () => {
  it('string[]', async () => {
    let {fieldTrans, initContent} = await fields2CtrContent(
      [
        {
          name: 'PARSED_IDS',
          filedAst: typeDef.fields.PARSED_IDS,
        },
      ],
      typeOptions,
      typeDef,
    );
    expect(initContent).toMatchSnapshot();
    expect(fieldTrans.join(',')).toMatchSnapshot();
  });
});

describe('枚举类型转换', () => {
  it('Enum<Phone> 用法的支持', async () => {
    let {fieldTrans, initContent} = await fields2CtrContent(
      [
        {
          name: 'type',
          filedAst: typeDef.fields.type,
        },
      ],
      typeOptions,
      typeDef,
    );
    expect(fieldTrans).toMatchSnapshot('枚举类型转换');
  });
});

describe('map<string,List<string>>转换方法', () => {
  it('map类型转换生成', async () => {
    let {fieldTrans, initContent} = await fields2CtrContent(
      [
        {
          name: 'billIdMap',
          filedAst: typeDef.fields.billIdMap,
        },
      ],
      typeOptions,
      typeDef,
    );
    expect(initContent).toMatchSnapshot();
    expect(fieldTrans.join(',')).toEqual(
      'billIdMap:java.Map(billIdMapMapTransfer)',
    );
  });

  it('Map<string,List<object>>转换方法', async () => {
    let {fieldTrans, initContent} = await fields2CtrContent(
      [
        {
          name: 'cats',
          filedAst: typeDef.fields.cats,
        },
      ],
      typeOptions,
      typeDef,
    );
    expect(initContent).toEqual('');
    expect(fieldTrans.join(',')).toMatchSnapshot();
  });
});

const typeDef = {
  fields: {
    initPrice: {
      name: 'java.math.BigDecimal',
      typeArgs: [],
    },
    skuIds: {
      name: 'java.util.Collection',
      typeArgs: [
        {
          isWildcard: false,
          type: {
            name: 'java.lang.String',
            typeArgs: [],
          },
        },
      ],
    },
    PARSED_IDS: {
      elementType: {
        name: 'java.lang.String',
        typeArgs: [],
      },
      isArray: true,
    },
    type: {
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
    cats: {
      isArray: false,
      name: 'java.util.List',
      typeArgs: [
        {
          isWildcard: false,
          type: {
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
                  name: 'java.lang.Object',
                  typeArgs: [],
                },
              },
            ],
          },
        },
      ],
    },
    billIdMap: {
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
  },
  isEnum: false,
  isInterface: false,
  methods: {
    getAllJobDetails: {
      formalParams: [],
      isOverride: false,
      params: [],
      ret: {
        isArray: false,
        name: 'java.util.Map',
        typeArgs: [],
      },
      typeParams: [],
    },
  },
  name: 'com.qianmi.pc.api.app.stock.response.AppBillIdGetResponse',
  values: [],
  typeParams: [],
};

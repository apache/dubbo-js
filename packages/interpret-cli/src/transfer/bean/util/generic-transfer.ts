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
import {IntepretHandle} from '../../../handle';
import {jType2Ts} from '../../../util/type-parse';
import {IJClass, IJFieldPropers, ITypeSearch} from '../../../typings';
import {TypeParameterDeclarationStructure} from 'ts-simple-ast';

const log = debug('j2t:core:toBeanClass:transfer');

const javaNativeConnection = [
  'java.util.Set',
  'java.util.Collection',
  'java.util.HashSet',
  'java.util.TreeSet',
  'java.util.LinkedHashSet',
  'java.util.List',
  'java.util.ArrayList',
  'java.util.LinkedList',
  'java.util.Vector',
];

const javaNativeMap = [
  'java.util.Map',
  'java.util.HashMap',
  'java.util.IdentityHashMap',
  'java.util.Hashtable',
  'java.util.LinkedHashMap',
  'java.util.TreeMap',
];

/**
 * @desc
 *
 * @使用场景
 *
 * @company pinduoduo.com
 * @Date    2019/5/13
 **/
interface IFiled {
  name: string;
  filedAst: IJFieldPropers;
}

export function genericGetCtorParaStr(
    className: string,
    typeParameters: TypeParameterDeclarationStructure[] = [],
) {
  if (typeParameters.length === 0) {
    return 'I' + className;
  } else {
    return `I${className}<${typeParameters.map(({name}) => name.replace("=any","")).join(',')}>`;
  }
}

/**
 * 初始化处理;;
 * @param fileds
 * @param typeOption
 * @param {IJClass} typeDef
 * @returns {{initContent: string; fieldTrans: Array<string>}}
 */
export async function genericFields2CtrContent(
    fileds: IFiled[],
    typeOption: ITypeSearch,
    typeDef: IJClass,
): Promise<{
  initContent: string;
  fieldTrans: Array<string>;
}> {
  let initContent = '',
      fieldTrans = [];

  for (var i = 0, iLen = fileds.length; i < iLen; i++) {
    var {name, filedAst} = fileds[i];

    if (filedAst.isArray) {
      let firstDTypeClassPath = filedAst.elementType.name;
      if (typeOption.hasAst(firstDTypeClassPath)) {
        fieldTrans.push(`${name}:java.array("${firstDTypeClassPath}",(this.${name}||[]).map(paramItem=>{
          return java("${firstDTypeClassPath}", paramItem)
          }))`);
      } else if (firstDTypeClassPath.startsWith('java.lang')) {
        fieldTrans.push(`${name}:java.array('${firstDTypeClassPath}',(this.${name}||[]).map(paramItem=>{
          return java("${firstDTypeClassPath}", paramItem)
          }))`);
      } else {
        throw new Error('数组下未支持类型;;');
      }
    } else if (filedAst.name === 'java.lang.Enum') {
      // 枚举的一种写法;   private Enum<Phone> type; ==> private Phone type;
      fieldTrans.push(
          `${name}:${j2Jtj(typeOption, {
            classPath: filedAst.typeArgs[0].type.name,
            paramRefName: `this.${name}`,
          })}`
      );
    } else if (filedAst.typeArgs && filedAst.typeArgs.length > 0) {
      let isWildcard = false;
      for (var j = 0, jLen = filedAst.typeArgs.length; j < jLen; j++) {
        var typeArg = filedAst.typeArgs[j];
        if (typeArg.isWildcard) {
          isWildcard = true;
          break;
        }
      }

      if (isWildcard) {
        continue;
      }

      if (
          javaNativeConnection.includes(filedAst.name)
      ) {
        if (
            javaNativeMap.includes(
                filedAst.typeArgs[0].type.name,
            )
        ) {
          let forEachStr = `(this.${name}||[])`;
          if (filedAst.name === 'Set') {
            forEachStr = `[... this.${name}]`;
          }

          fieldTrans.push(
              `${name}:java("${filedAst.name}",(${forEachStr}.map(paramItem=>{
              ${mapParseContent(
                  'paramItemMapTransfer',
                  'paramItem',
                  filedAst.typeArgs[0].type,
                  typeOption,
              )}
               return paramItemMapTransfer;
          })))`);
        } else {
          //List', 'Set泛型的处理 List<string> List<request>
          let forEachStr = `(this.${name}||[])`;
          if (filedAst.name === 'Set') {
            forEachStr = `[... this.${name}]`;
          }

          // let _classNam =
          //   filedAst.name !== 'java.util.Collection'
          //     ? filedAst.name
          //     : 'java.util.List';
          fieldTrans.push(
              `${name}:this.${name}?java("${filedAst.name}",${forEachStr}.map(paramItem=>{
          return java("${filedAst.typeArgs[0].type.name}", paramItem)
          }))
          :null
          `);
        }
      } else if (
          javaNativeMap.includes(filedAst.name)
      ) {
        let keyType, valType;

        keyType = jType2Ts(filedAst.typeArgs[0].type, typeOption);
        valType = jType2Ts(filedAst.typeArgs[1].type, typeOption);

        if (filedAst.typeArgs[1].type.typeArgs.length === 0) {
          //一级 Map<string,Request>
          initContent += `let ${name}MapTransfer = new Map();
          for(let mapKey  in this.${name}){
              ${name}MapTransfer.set(${j2Jtj(typeOption, {
            paramRefName: `mapKey`,
            classPath: filedAst.typeArgs[0].type.name,
          })}, ${j2Jtj(typeOption, {
            paramRefName: `this.${name}[mapKey]`,
            classPath: filedAst.typeArgs[1].type.name,
          })});
          };
          `;
        } else if (filedAst.typeArgs[1].type.typeArgs.length === 1) {
          //二级 Map<string,List<Request>>   Map<string,List<string>>  Map<string,List<Object>>
          if (
              javaNativeConnection.includes(filedAst.typeArgs[1].type.name)
          ) {
            initContent += `let ${name}MapTransfer = new Map();
          for(let mapKey  in this.${name}) {
              ${name}MapTransfer.set(${j2Jtj(typeOption, {
              paramRefName: `mapKey`,
              classPath: filedAst.typeArgs[0].type.name,
            })}, java.List(this.${name}[mapKey].map(paramItem=>{
                    return ${j2Jtj(typeOption, {
              paramRefName: 'paramItem',
              classPath:
              filedAst.typeArgs[1].type.typeArgs[0].type.name,
            })}}))
             );
          };
          `;
          } else {
            throw new Error('泛型层级过深暂不支持;');
          }
        } else {
          throw new Error('泛型层级过深暂不支持;');
        }

        fieldTrans.push(
            `${name}:java("${filedAst.name}",(${name}MapTransfer))`,
        );
      } else {
        throw new Error(`暂不支持该类型转换${typeDef.name}.${name}`);
      }
    } else {
      fieldTrans.push(
          `${name}:java("${filedAst.name}", this.${name})`,
      );
    }
  }

  return {fieldTrans, initContent};
}

/**
 *
 *
 * @param {IntepretHandle} intepretHandle
 * @param {string} name
 * @param {IJFieldPropers} fieldPropers
 */
export function mapParseContent(
    resultMapName: string,
    mapValName: string,
    fieldPropers: IJFieldPropers,
    typeOption: ITypeSearch,
) {
  let initContent = `let ${resultMapName} = new Map();
          for(let mapKey  in ${mapValName}){
              ${resultMapName}.set(${j2Jtj(typeOption, {
    paramRefName: `mapKey`,
    classPath: fieldPropers.typeArgs[0].type.name,
  })}, ${j2Jtj(typeOption, {
    paramRefName: `${mapValName}[mapKey]`,
    classPath: fieldPropers.typeArgs[1].type.name,
  })});
          };
          `;
  return initContent;
}

/**
 * 生成field转换源代码
 *
 * @param intepretHandle
 * @param {any} name    字段名称
 * @param {any} classPath    字段java所属类型  eg:java.lang.String java.math.BigDecimal,java.util.Map
 * @returns {string}
 */
export function j2Jtj(
    typeOptions: ITypeSearch,
    {
      paramRefName,
      classPath,
    }: {
      paramRefName: string;
      classPath: string;
    },
) {
  if (typeOptions.hasAst(classPath)) {
    //处理bean对象类型, 或者枚举类型;
    let {isClass, isEnum} = typeOptions.getTypeInfo(classPath);

    if (isEnum) {
      log(`添加枚举转换(java.enum) ${classPath}`);
      return `java['enum'](
                  '${classPath}',
                  ${classPath.substring(
          classPath.lastIndexOf('.') + 1,
      )}[${paramRefName}]
                )`;
    } else if (isClass) {
      log(`添加对象转换(__fields2java)${classPath}`);
      //引入类并且不是枚举类型
      return `${paramRefName}?${paramRefName}.__fields2java():null`;
    } else {
      return `${paramRefName}['__fields2java']?${paramRefName}['__fields2java']():${paramRefName}`;
      // throw new Error('不可能出现这种的,classPathStr:' + classPath + isClass);
    }
  } else if (typeOptions.isTypeParam(classPath)) {
    return `(${paramRefName}&&${paramRefName}['__fields2java'])?${paramRefName}['__fields2java']():${paramRefName}`;
  } else if (classPath === 'java.math.BigDecimal') {
    log('处理java BigDecimal类型,param %j,schema %j');
    return `${paramRefName}?java.BigDecimal(${paramRefName}.value):null`;
  } else if (classPath === 'java.util.Date') {
    return `${paramRefName}`; //时间类型 js2java可以直接识别;
  } else if (classPath === 'java.lang.Object') {
    return `(${paramRefName}&&${paramRefName}['__fields2java'])?${paramRefName}['__fields2java']():${paramRefName}`;
  } else if (classPath.startsWith('java.lang.')) {
    return `java.${classPath.substring(
        classPath.lastIndexOf('.') + 1,
    )}(${paramRefName})`;
  } else {
    return `${paramRefName}`
  }
}

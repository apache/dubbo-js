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

export interface IExtraResult {
  jarDir: string;
  jarInfo: string;
}

export interface IDubboExtInfo {
  //解析入口 "com.qianmi";
  entry: string;
  //指定要解析的jar包路径
  entryJarPath: string;
  //指定jar包依赖的包目录
  libDirPath: string;
  //provider后缀名可配置,默认值 Provider
  providerSuffix?: string;
}

export interface IConfig extends IDubboExtInfo {
  output: string;
  jarInfo?: string;
}

export interface ITypeSearch {
  //添加依赖
  addDenpend: IAddDenpend;
  //是否是类泛型参数
  isTypeParam: isTypeParam;
  //在配置文件中是否包含抽象语法树
  hasAst: IHasAst;
  //是否是枚举类型
  getTypeInfo: IGetTypeInfo;
}

export interface IGetTypeInfo {
  (classPath: string): TypeInfoI;
}

export interface isTypeParam {
  (typeParamName: string): boolean;
}

export interface ITypeParameterItem {
  name: string;
}

export interface TypeInfoI {
  classPath: string;
  className: string;
  packagePath: string;
  isProvider: boolean;
  isClass: boolean;
  isEnum: boolean;
  typeParameters?: ITypeParameterItem[];
}

export interface IHasAst {
  (classPath: string): boolean;
}

export interface IDependItem {
  classPath: string;
  name: string;
  importName: string;
}
export interface IAddDenpend {
  (classPath: string): Promise<IDependItem>;
}

/**
 * 类型属性信息
 */
export interface ITypePropers {
  isArray?: boolean;
  elementType?: ITypePropers;
  name?: typePath;
  typeArgs?: ITypeArg[];
}

/**
 * 类型路径;
 */
export type typePath = string;

/**
 * java字段属性;
 */
export interface IJFieldPropers extends ITypePropers {}

/**
 *
 "typeArgs":[{
						"isWildcard":false,
						"type":{
							"isArray":false,
							"name":"java.lang.String",
							"subTypes":[],
							"typeArgs":[]
						}
					}]
 */
export interface ITypeArg {
  isWildcard: boolean;
  type: ITypePropers;
}

/**
 * 泛型相关配置;
 */
export interface ITypeParam {
  name: string;
  types: ITypePropers[];
}

/**
 * 方法属性
 */
export interface IJMethodPropers {
  formalParams: string[]; //变量名称;
  params: ITypePropers[]; //变量类型
  isOverride: boolean;
  ret: ITypePropers;
  typeParams: ITypeParam[];
}

export interface IJMethod {
  [methodName: string]: IJMethodPropers;
}

export interface IJClass {
  fields: {
    [classPath: string]: IJFieldPropers;
  };
  isEnum: boolean;
  isInterface: boolean;
  isAbstract?: boolean;
  methods: IJMethod;
  privateFields: string[]; //私有变量
  typeParams: ITypeParam[];
  values?: string[] | number[]; //枚举类型首个值;
  name: typePath;
}

export interface IJarInfo {
  classes: {
    [classPath: string]: IJClass;
  };
  providers: string[];
}

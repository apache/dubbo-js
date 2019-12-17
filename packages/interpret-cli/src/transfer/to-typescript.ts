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
import {SourceFile} from 'ts-simple-ast';
import {IntepretHandle} from '../handle';
import {toEnum} from './bean/to-enum';
import {toBeanClass} from './bean/to-vo';
import {toInterface} from './provider/to-interface';
import {toProxyFunc} from './provider/to-proxy-function';
import {toWrapperClass} from './provider/to-wrapper-class';

const log = debug('j2t:core:toTypewcript');

/**
 * java 类型转换为typescript type-ast
 * @param astJava
 * @param {SourceFile} sourceFile
 * @returns {SourceFile}
 */
export async function toTypescript(
  intepretHandle: IntepretHandle,
): Promise<SourceFile> {
  log('调用转换方法 toTypescript::', intepretHandle.classPath);
  let {sourceFile, astJava} = intepretHandle;

  let lastPointIndex = astJava.name.lastIndexOf('.') + 1;
  let typeInfo = {
    classPath: astJava.name,
    packagePath: astJava.name.substring(0, lastPointIndex),
    className: astJava.name.substring(lastPointIndex),
    isEnum: astJava.isEnum,
    isAbstract: astJava.isAbstract,
    isInterface: astJava.isInterface,
    isClass: !astJava.isEnum && !astJava.isInterface,
    isProvider: astJava.name.endsWith(
      String(intepretHandle.providerSuffix) || 'Provider',
    ),
  };
  intepretHandle.request.registerTypeInfo(typeInfo);

  if (astJava.isAbstract && !typeInfo.isProvider) {
    console.warn('warning 抽象类型要注意了.classPath:', typeInfo.classPath);
  }

  try {
    if (astJava.isEnum) {
      sourceFile.addEnum(toEnum(astJava.name, astJava, intepretHandle));
    } else {
      if (typeInfo.isProvider) {
        sourceFile.addInterface(await toInterface(astJava, intepretHandle));
        sourceFile.addVariableStatement(
          toWrapperClass(astJava, intepretHandle),
        );
        sourceFile.addImport({
          moduleSpecifier: 'dubbo-js',
          defaultImport: '{TDubboCallResult,Dubbo}',
        });
        sourceFile.addFunction(
          toProxyFunc({
            typeName: intepretHandle.classPath.substring(
              intepretHandle.classPath.lastIndexOf('.') + 1,
            ),
            typePath: intepretHandle.classPath,
          }),
        );
      } else {
        sourceFile.addClass(await toBeanClass(astJava, intepretHandle));
        sourceFile.addImport({
          moduleSpecifier: 'js-to-java',
          defaultImport: 'java',
        });
      }
    }
  } catch (err) {
    console.error(
      `为${intepretHandle.classPath},${JSON.stringify(typeInfo)} 添加内容出错,`,
      err,
    );
  }

  return sourceFile;
}

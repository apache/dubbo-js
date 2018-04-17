/**
 * @desc
 *
 * @使用场景
 *
 * @company qianmi.com
 * @Date    2017/12/13
 **/

import debug from 'debug';
import {toEnum} from './bean/to-enum';
import {toBeanClass} from './bean/to-vo';
import {SourceFile} from 'ts-simple-ast';
import {IntepretHandle} from '../handle';
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
  let {
    sourceFile,
    astJava,
    request: {
      config: {dubboVersion, dubboGroup},
    },
  } = intepretHandle;

  let lastPointIndex = astJava.name.lastIndexOf('.') + 1;
  let typeInfo = {
    classPath: astJava.name,
    packagePath: astJava.name.substring(0, lastPointIndex),
    className: astJava.name.substring(lastPointIndex),
    isEnum: astJava.isEnum,
    isInterface: astJava.isInterface,
    isClass: !astJava.isEnum && !astJava.isInterface,
    isProvider: astJava.name.endsWith('Provider'),
  };
  intepretHandle.request.registerTypeInfo(typeInfo);

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
          moduleSpecifier: 'dubbo2.js',
          defaultImport: '{TDubboCallResult,Dubbo}',
        });
        sourceFile.addFunction(
          toProxyFunc({
            typeName: intepretHandle.classPath.substring(
              intepretHandle.classPath.lastIndexOf('.') + 1,
            ),
            typePath: intepretHandle.classPath,
            version: dubboVersion,
            group: dubboGroup,
          }),
        );
      } else {
        sourceFile.addClass(await toBeanClass(astJava, intepretHandle));
        sourceFile.addImport({
          moduleSpecifier: 'js-to-java',
          defaultImport: '* as java',
        });
      }
    }

    sourceFile.addImport({
      moduleSpecifier: 'interpret-util',
      defaultImport: '{argumentMap}',
    });
  } catch (err) {
    console.error(
      `为${intepretHandle.classPath},${JSON.stringify(typeInfo)} 添加内容出错,`,
      err,
    );
  }

  return sourceFile;
}

import debug from "debug";
import {relative} from "path";
import {ImportDeclarationStructure} from "ts-simple-ast";

const log = debug("j2t:core:toImport");

export interface IToImportParam {
  className: string;
  classPath: string;
  packagePath: string;
}

/**
 * java import 转换为ts的import ast
 * @param {any} className
 * @param {any} classPath
 * @param {any} packagePath
 * @returns {ImportDeclarationStructure}
 */
export function toImport({
                           className,
                           classPath,
                           packagePath
                         }: IToImportParam): ImportDeclarationStructure {
  log('调用转换方法 toImport::', className, classPath, packagePath);

  return {
    moduleSpecifier:
    "./" + relative(packagePath.split('.').join('/'), classPath.split('.').join('/')),
    namedImports: [{name: className}]
  };
}

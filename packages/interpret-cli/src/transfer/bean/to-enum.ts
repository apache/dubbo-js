import debug from "debug";
import {EnumDeclarationStructure} from "ts-simple-ast";
import {IntepretHandle} from "../../handle";
import {IJClass} from "../../typings";

const log = debug('j2t:core:toField');

/**
 * 枚举类型转换;
 * @param enumDef
 * @returns {EnumDeclarationStructure}
 */
export function toEnum(
  className: string,
  enumDef: IJClass,
  intepretHandle: IntepretHandle,
): EnumDeclarationStructure {
  log('转换 为枚举:%o', enumDef);

  let members = [],
    paramNmu = 0,
    fieldIndex = 0;
  for (var fieldsKey in enumDef.fields) {
    if (enumDef.fields[fieldsKey].name === className) {
      let initializer = `"${fieldsKey}"`,
        values = intepretHandle.astJava.values || [];

      if (typeof values[fieldIndex] === "number") {
        initializer = `${values[fieldIndex]}`;
      }

      members.push({
        name: fieldsKey,
        initializer
      });
      fieldIndex++;
    } else {
      paramNmu++;
    }
  }

  console.warn(
    "warning:调用转换方法 toEnum::",
    className,
    "参数数量:",
    paramNmu,
    " 联系相关接口开发人员,尽量不要使用枚举类型"
  );
  return {
    isExported: true,
    name: intepretHandle.getTypeInfo(className).className,
    members,
  };
}

import debug from "debug";
import {IntepretHandle} from "../handle";
import {IJMethodPropers} from "../typings";
import {jType2Ts} from "../util/type-parse";
import {MethodSignatureStructure} from "ts-simple-ast";

const log = debug('j2t:core:toMethod');

/**
 * java方法转换为typescript method-ast ;
 * @param methodDef
 * @returns {MethodSignatureStructure}
 */
export async function toMethod(
  methodName: string,
  methodDef: IJMethodPropers,
  intepretHandle: IntepretHandle,
): Promise<MethodSignatureStructure> {
  log('调用转换方法 toMethod::', methodName, methodDef);
  let parameters = [];
  for (var i = 0, iLen = methodDef.params.length; i < iLen; i++) {
    var paramItem = methodDef.params[i];
    if (paramItem.isArray) {
      let type = await jType2Ts(paramItem.elementType, intepretHandle);
      let name =
        (methodDef.formalParams && methodDef.formalParams[i]) ||
        paramItem.elementType.name.substring(
          paramItem.elementType.name.lastIndexOf(".") + 1
        ) + i;
      parameters.push({
        name,
        type: type + '[]',
      });
    } else {
      let type = await jType2Ts(paramItem, intepretHandle);
      let name =
        (methodDef.formalParams && methodDef.formalParams[i]) ||
        paramItem.name.substring(paramItem.name.lastIndexOf(".") + 1) + i;
      parameters.push({
        name,
        type,
      });
    }
  }

  let returnType = await jType2Ts(methodDef.ret, intepretHandle);

  return {
    name: methodName,
    parameters,
    returnType: `TDubboCallResult<${returnType}>`,
  };
}

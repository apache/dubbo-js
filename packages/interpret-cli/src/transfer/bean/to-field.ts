import debug from "debug";
import {IntepretHandle} from "../../handle";
import {IJFieldPropers} from "../../typings";
import {jType2Ts} from "../../util/type-parse";
import {PropertySignatureStructure} from "ts-simple-ast";

const log = debug('j2t:core:toField');

/**
 * 对象的field转换;  ast
 *
 * @param fieldDef
 * @returns {PropertySignatureStructure}
 */
export async function toField(
  fieldName: string,
  fieldProps: IJFieldPropers,
  intepretHandle: IntepretHandle,
): Promise<PropertySignatureStructure> {

  log('转换 为属性:%o', fieldProps);

  let type = await jType2Ts(fieldProps, intepretHandle);
  return {
    name: fieldName,
    hasQuestionToken: true,
    type,
  };
}




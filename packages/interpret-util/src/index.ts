/**
 * @desc
 *
 * @使用场景
 *
 * @company qianmi.com
 * @Date    2017/12/23
 **/
import debug from "debug";

const log = debug("j2t:core:paramEnhance");

export function argumentMap() {
  let _arguments = Array.from(arguments);

  return _arguments.map(
    argumentItem =>
      argumentItem.__fields2java
        ? paramEnhance(argumentItem.__fields2java())
        : argumentItem
  );
}


//删除对象中包含undefined 与null的值情况
function paramEnhance(javaParams: Array<object> | object) {
  if (javaParams instanceof Array) {
    for (let i = 0, ilen = javaParams.length; i < ilen; i++) {
      let itemParam = javaParams[i];
      minusRedundancy(itemParam);
    }
  } else {
    minusRedundancy(javaParams);
  }
  return javaParams;
}

function minusRedundancy(itemParam: any) {
  if (!itemParam) {
    return;
  }
  for (var _key in itemParam.$) {
    if (itemParam.$[_key] === null || itemParam.$[_key] === undefined) {
      delete itemParam.$[_key];
      log("删除 key %s from %j ", itemParam, _key);
    }
  }
}

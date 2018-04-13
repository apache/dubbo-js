/**
 * 将num转换为二进制的buff，不够的长度补0
 * @param num 要转换的数据
 * @param byteLength 生成的字节数量
 */
export function binaryNum(num: number, byteLength: number) {
  const str = num.toString(2);
  //补齐位数
  const paddingStr = padding(str, byteLength * 8);
  const buffer = Buffer.alloc(byteLength);

  for (let i = 0; i < byteLength; i++) {
    const start = i * 8;
    const end = start + 8;
    buffer[i] = parseInt(paddingStr.substring(start, end), 2);
  }

  return buffer;
}

/**
 * 解析buffer还原为数字
 * @param binNum
 * @param byteLength
 */
export function convertBinaryNum(binNum: Buffer, byteLength: number) {
  let str = '';
  for (let i = 0; i < byteLength; i++) {
    str += padding(binNum[i].toString(2), 8);
  }
  return parseInt(str, 2);
}

/**
 * 不够位数，补0
 * @param str
 * @param padding
 */
function padding(str: string, padding: number) {
  const offset = padding - str.length;
  return '0'.repeat(offset) + str;
}

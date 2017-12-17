/**
 * 生成二进制的buffer
 * @param num
 * @param byteLength
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
 * 解析buffer还原为uuid
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

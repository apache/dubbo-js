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

const assert = require('assert');

function padding(str, padding) {
  const offset = padding - str.length;
  return '0'.repeat(offset) + str;
}

function binaryNum1(num, byteLength) {
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

// 在源文件中进行了搜索，发现 binaryNum 的作用就是对 big-endian 的 uint32 和 uint64 进行序列化
// 所以该实现只针对这样两种类型
function binaryNum2(num, byteLength) {
  const buf = Buffer.allocUnsafe(byteLength);
  if (num <= Number.MAX_SAFE_INTEGER) {
    if (byteLength === 4) {
      buf.writeUInt32BE(num, 0);
    } else {
      buf.writeUInt32BE(0, 0);
      buf.writeUInt32BE(num, 4);
    }
  } else {
    const high = Math.floor(num / Math.pow(2, 32));
    const low = num & 0xffffffff;
    buf.writeUInt32BE(high);
    buf.writeUInt32BE(low, 4);
  }
  return buf;
}

// test
assert.ok(
  binaryNum1(1025, 4).equals(Buffer.from([0x00, 0x00, 0x04, 0x01])),
  '1 - 1025',
);
assert.ok(
  binaryNum1(201212, 8).equals(
    Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x11, 0xfc]),
  ),
  '1 - 201212',
);
assert.ok(
  binaryNum1(13234234234234234234, 8).equals(
    Buffer.from([0xb7, 0xa9, 0x71, 0xeb, 0x05, 0xd8, 0x68, 0x00]),
  ),
  '1 - 13234234234234234234',
);

assert.ok(
  binaryNum2(1025, 4).equals(Buffer.from([0x00, 0x00, 0x04, 0x01])),
  '2 - 1025',
);
assert.ok(
  binaryNum2(201212, 8).equals(
    Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x11, 0xfc]),
  ),
  '2 - 201212',
);
assert.ok(
  binaryNum2(13234234234234234234, 8).equals(
    Buffer.from([0xb7, 0xa9, 0x71, 0xeb, 0x05, 0xd8, 0x68, 0x00]),
  ),
  '2 - 13234234234234234234',
);

// benchmark
console.time('1 - 1025');
for (let i = 0; i < 1000000; i++) {
  binaryNum1(1025, 4);
}
console.timeEnd('1 - 1025');

console.time('2 - 1025');
for (let i = 0; i < 1000000; i++) {
  binaryNum2(1025, 4);
}
console.timeEnd('2 - 1025');

console.time('1 - 201212');
for (let i = 0; i < 1000000; i++) {
  binaryNum1(201212, 4);
}
console.timeEnd('1 - 201212');

console.time('2 - 201212');
for (let i = 0; i < 1000000; i++) {
  binaryNum2(201212, 4);
}
console.timeEnd('2 - 201212');

console.time('1 - 13234234234234234234');
for (let i = 0; i < 1000000; i++) {
  binaryNum1(13234234234234234234, 8);
}
console.timeEnd('1 - 13234234234234234234');

console.time('2 - 13234234234234234234');
for (let i = 0; i < 1000000; i++) {
  binaryNum2(13234234234234234234, 8);
}
console.timeEnd('2 - 13234234234234234234');

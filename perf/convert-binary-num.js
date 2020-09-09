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

function convertBinaryNum1(binNum, byteLength) {
  let str = '';
  for (let i = 0; i < byteLength; i++) {
    str += padding(binNum[i].toString(2), 8);
  }
  return parseInt(str, 2);
}

// 在源文件中进行了搜索，发现 convertBinaryNum2 的作用就是对 big-endian 的 byte[4] 和 byte[8]
// 进行反序列化成 uint32 和 uint64，所以该实现只针对这样两种类型
function convertBinaryNum2(binNum, byteLength) {
  // 感觉 byteLength 是不是可以省略，直接取 binNum.length 可以减少一些脑力负担
  if (byteLength === 4) {
    return binNum.readUInt32BE(0);
  }
  const high = binNum.readUInt32BE(0) * Math.pow(2, 32);
  const low = binNum.readUInt32BE(4);
  return high + low;
}

// test
assert.ok(
  convertBinaryNum1(Buffer.from([0x00, 0x00, 0x04, 0x01]), 4) === 1025,
  '1 - 1025',
);

assert.ok(
  convertBinaryNum1(
    Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x11, 0xfc]),
    8,
  ) === 201212,
  '1 - 201212',
);

assert.ok(
  convertBinaryNum1(
    Buffer.from([0xb7, 0xa9, 0x71, 0xeb, 0x05, 0xd8, 0x68, 0x00]),
    8,
  ) === 13234234234234234234,
  '1 - 13234234234234234234',
);

assert.ok(
  convertBinaryNum2(Buffer.from([0x00, 0x00, 0x04, 0x01]), 4) === 1025,
  '2 - 1025',
);

assert.ok(
  convertBinaryNum2(
    Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x11, 0xfc]),
    8,
  ) === 201212,
  '2 - 201212',
);

assert.ok(
  convertBinaryNum2(
    Buffer.from([0xb7, 0xa9, 0x71, 0xeb, 0x05, 0xd8, 0x68, 0x00]),
    8,
  ) === 13234234234234234234,
  '2 - 13234234234234234234',
);

// benchmark
console.time('1 - 1025');
for (let i = 0; i < 1000000; i++) {
  convertBinaryNum1(Buffer.from([0x00, 0x00, 0x04, 0x01]), 4);
}
console.timeEnd('1 - 1025');

console.time('2 - 1025');
for (let i = 0; i < 1000000; i++) {
  convertBinaryNum2(Buffer.from([0x00, 0x00, 0x04, 0x01]), 4);
}
console.timeEnd('2 - 1025');

console.time('1 - 201212');
for (let i = 0; i < 1000000; i++) {
  convertBinaryNum1(
    Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x11, 0xfc]),
    8,
  );
}
console.timeEnd('1 - 201212');

console.time('2 - 201212');
for (let i = 0; i < 1000000; i++) {
  convertBinaryNum2(
    Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x11, 0xfc]),
    8,
  );
}
console.timeEnd('2 - 201212');

console.time('1 - 13234234234234234234');
for (let i = 0; i < 1000000; i++) {
  convertBinaryNum1(
    Buffer.from([0xb7, 0xa9, 0x71, 0xeb, 0x05, 0xd8, 0x68, 0x00]),
    8,
  );
}
console.timeEnd('1 - 13234234234234234234');

console.time('2 - 13234234234234234234');
for (let i = 0; i < 1000000; i++) {
  convertBinaryNum2(
    Buffer.from([0xb7, 0xa9, 0x71, 0xeb, 0x05, 0xd8, 0x68, 0x00]),
    8,
  );
}
console.timeEnd('2 - 13234234234234234234');

function toBytes4(num) {
  assert.ok(num >= 0 && num <= 0xffffffff);
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(num, 0);
  return buf;
}

function toBytes8(num) {
  assert.ok(num >= 0 && num <= Number.MAX_SAFE_INTEGER);
  const buf = Buffer.allocUnsafe(8);
  const high = Math.floor(num / Math.pow(2, 32));
  const low = (num & 0xffffffff) >>> 0;
  buf.writeUInt32BE(high);
  buf.writeUInt32BE(low, 4);
  return buf;
}

function fromBytes4(buf) {
  return buf.readUInt32BE(0);
}

function fromBytes8(buf) {
  const high = buf.readUInt32BE(0);
  assert(high <= 0x1fffff);
  const low = buf.readUInt32BE(4);
  return high * Math.pow(2, 32) + low;
}

assert.ok(
  toBytes8(201212).equals(
    Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x11, 0xfc]),
  ),
  'toBytes8(201212)',
);

assert.ok(
  toBytes8(9007199254740991).equals(
    Buffer.from([0x00, 0x1f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
  ),
  'toBytes8(9007199254740991)',
);

assert.ok(
  fromBytes8(Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x11, 0xfc])) ===
    201212,
  'fromBytes8(201212)',
);

assert.ok(
  fromBytes8(Buffer.from([0x00, 0x1f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])) ===
    9007199254740991,
  'fromBytes8(9007199254740991)',
);

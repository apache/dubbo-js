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

import HeartBeat from '../heartbeat';

it('心跳值测试e2', () => {
  const buffer = Buffer.from([
    0xda,
    0xbb,
    0xe2,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x05,
    0x00,
    0x00,
    0x00,
    0x01,
    0x4e,
  ]);
  expect(HeartBeat.isHeartBeat(buffer)).toBe(true);

  //mock数据
  const buffer2 = Buffer.from([
    0xda,
    0xbb,
    0x02,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x05,
    0x00,
    0x00,
    0x00,
    0x01,
    0x4e,
  ]);
  expect(HeartBeat.isHeartBeat(buffer2)).toBe(false);
});

it('心跳值检测', () => {
  let buffer = HeartBeat.encode();
  expect(buffer).toEqual(
    Buffer.from([
      0xda,
      0xbb,
      0xe2,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x01,
      0x4e,
    ]),
  );
});

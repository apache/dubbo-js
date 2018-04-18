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
import {binaryNum, convertBinaryNum} from '../binary';

describe('binary test suite', () => {
  it('test binaryNum', () => {
    expect(binaryNum(1025, 4)).toEqual(new Buffer([0x00, 0x00, 0x04, 0x01]));
    expect(binaryNum(201212, 4)).toEqual(new Buffer([0x00, 0x03, 0x11, 0xfc]));
  });

  it('test convert number', () => {
    expect(convertBinaryNum(new Buffer([0x00, 0x00, 0x04, 0x01]), 4)).toEqual(
      1025,
    );
    expect(convertBinaryNum(new Buffer([0x00, 0x03, 0x11, 0xfc]), 4)).toEqual(
      201212,
    );
  });

  it('test binary uuid', () => {
    const seed = 13234234234234234234;
    const buffer = binaryNum(seed, 8);
    const num = convertBinaryNum(buffer, 8);
    expect(seed).toEqual(num);
  });
});

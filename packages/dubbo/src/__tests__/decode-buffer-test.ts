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
import {Buffer} from 'buffer';
import {decode} from '../decode';
import DecodeBuffer from '../decode-buffer';

it('test receive right data', () => {
  const buffer = Buffer.from([
    0xda,
    0xbb,
    0x02,
    0x14,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x02,
    0x00,
    0x00,
    0x00,
    0x06,
    0x91,
    0x04,
    0x70,
    0x61,
    0x6e,
    0x67,
  ]);
  const dBuff = new DecodeBuffer().subscribe(data => {
    const {requestId, res, err} = decode(data);
    expect(requestId).toEqual(2);
    expect(res).toEqual('pang');
    expect(err).toEqual(null);
  });
  dBuff.receive(buffer);
});

it('test receive wrong data', () => {
  const buffer = Buffer.from([
    0x00,
    0x32,
    0xe2,
    0xda,
    0xbb,
    0x02,
    0x14,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x02,
    0x00,
    0x00,
    0x00,
    0x06,
    0x91,
    0x04,
    0x70,
    0x61,
    0x6e,
    0x67,
  ]);
  const dBuff = new DecodeBuffer().subscribe(data => {
    const {requestId, res, err} = decode(data);
    expect(requestId).toEqual(2);
    expect(res).toEqual('pang');
    expect(err).toEqual(null);
  });
  dBuff.receive(buffer);
});

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

import {fromBytes4, fromBytes8, toBytes4, toBytes8} from '../byte';

it('test byte4', () => {
  const MAX = 4294967295; //2 ** 32 - 1
  for (let i = MAX; i > MAX - 100; i--) {
    const byte = toBytes4(i);
    expect(fromBytes4(byte)).toEqual(i);
  }
});

it('test byte8', () => {
  const MAX = Number.MAX_SAFE_INTEGER - 1;
  for (let i = MAX; i > MAX - 100; i--) {
    const byteBuf = toBytes8(i);
    expect(fromBytes8(byteBuf)).toEqual(i);
  }
});

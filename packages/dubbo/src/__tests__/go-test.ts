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

import fs from 'fs';
import {promisify} from 'util';
import {go} from '../go';

it('test resolve', async () => {
  const test = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      resolve('1');
    });
  };

  const {res, err} = await go(test());
  expect(res).toEqual('1');
  expect(err).toEqual(null);
});

it('test reject', async () => {
  const test = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      reject(new Error('I am wrong.'));
    });
  };

  const {res, err} = await go(test());
  expect(res).toEqual(null);
  expect(err.message).toEqual('I am wrong.');
});

it('test fs.exists async', async () => {
  const existsPromisify = promisify(fs.exists);
  const {res, err} = await go(existsPromisify('./to-test.ts'));
  expect(res).toEqual(false);
  expect(err).toEqual(null);
});

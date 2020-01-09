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

/**
 * ❯ node parseint-number.js
 * parseInt: 187.971ms
 * number: 95.057ms
 */
console.time('parseInt');
for (let i = 0; i < 1000000; i++) {
  parseInt(i + '');
}
console.timeEnd('parseInt');

console.time('parseInt 10');
for (let i = 0; i < 1000000; i++) {
  parseInt(i + '', 10);
}
console.timeEnd('parseInt 10');

console.time('prefix plus');
for (let i = 0; i < 1000000; i++) {
  +(i + '');
}
console.timeEnd('prefix plus');

console.time('number');
for (let i = 0; i < 1000000; i++) {
  Number(i + '');
}
console.timeEnd('number');

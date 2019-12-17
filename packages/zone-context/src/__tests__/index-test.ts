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

import zone from '../index';

it('test zone context', () => {
  zone.setRootContext('uuid', 1);
  expect(zone.get('uuid')).toEqual(1);

  (() => {
    //async
    setTimeout(() => {
      expect(zone.get('uuid')).toEqual(1);
    }, 20);

    //async
    process.nextTick(() => {
      expect(zone.get('uuid')).toEqual(1);
    });

    //nested
    new Promise(resolve => {
      new Promise(r => {
        setTimeout(() => {
          expect(zone.get('uuid')).toEqual(1);
          setImmediate(() => {
            expect(zone.get('uuid')).toEqual(1);
            process.nextTick(() => {
              expect(zone.get('uuid')).toEqual(1);
            });
          });
          r();
        }, 20);
      }).then(() => {
        expect(zone.get('uuid')).toEqual(1);
        resolve();
      });
    });
  })();

  expect(zone.get('uuid')).toEqual(1);
});

it('test zone context nest', () => {
  zone.setRootContext('uniqId', 'IUSDFKHEKRWE*&(&');

  setTimeout(() => {
    let userInfo = {
      name: 'yangxiaodong',
      tickeId: 'KHGJMNBSDFUTYU',
    };
    zone.setRootContext('userInfo', userInfo);
    expect(zone.get('userInfo')).toEqual(userInfo);
  }, 1000);
});

it('test zone context direct', () => {
  zone.setRootContext('lv1', 'lv1');

  setTimeout(() => {
    expect(zone.get('lv1')).toEqual('lv1');
    zone.setRootContext('lv2', 'lv2');
    setTimeout(() => {
      expect(zone.get('lv2')).toEqual('lv2');
      zone.setRootContext('lv3', 'lv3');
      setTimeout(() => {
        expect(zone.get('lv3')).toEqual('lv3');
        zone.setRootContext('lv4', 'lv4');
        setTimeout(() => {
          expect(zone.get('lv4')).toEqual('lv4');
          zone.setRootContext('lv5', 'lv5');
        }, 7000);
      }, 8000);
    }, 9000);
  }, 10000);
});

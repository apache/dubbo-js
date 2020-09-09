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

import {zk} from '../registry';
import setting from '../setting';

describe('zookeeper test suite', () => {
  it('test connect', () => {
    //dubbo-setting
    const dubboSetting = setting
      .match('org.apache.dubbo.demo.BasicTypeProvider', {
        version: '2.0.0',
      })
      .match(
        [
          'org.apache.dubbo.demo.DemoProvider',
          'org.apache.dubbo.demo.ErrorProvider',
        ],
        {version: '1.0.0'},
      );

    const client = zk({
      url: 'localhost:2181,localhost:2181,localhost:2181',
    })({
      interfaces: [
        'org.apache.dubbo.demo.DemoProvider',
        'org.apache.dubbo.demo.BasicTypeProvider',
        'org.apache.dubbo.demo.ErrorProvider',
      ],
      dubboSetting,
      application: {
        name: 'node-zookeeper-test',
      },
    });

    client.subscribe({
      onData(data) {
        expect(data.size).toEqual(1);
      },
      onError(err) {
        expect(err).toBeNull();
      },
    });
  });
});

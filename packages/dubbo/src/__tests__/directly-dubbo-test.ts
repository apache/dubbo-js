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

import {DirectlyDubbo, java} from 'dubbo-js';
import {
  DemoProviderWrapper,
  IDemoProvider,
} from './providers/org/apache/dubbo/demo/DemoProvider';
import {UserRequest} from './providers/org/apache/dubbo/demo/UserRequest';

const dubbo = DirectlyDubbo.from({
  dubboAddress: 'localhost:20880',
  dubboVersion: '2.0.0',
  dubboInvokeTimeout: 10,
});

const demoService = dubbo.proxyService<IDemoProvider>({
  dubboInterface: 'org.apache.dubbo.demo.DemoProvider',
  methods: DemoProviderWrapper,
  version: '1.0.0',
});

describe('demoService', () => {
  it('test sayHello', async () => {
    //@ts-ignore
    const {res, err} = await demoService.sayHello(java.String('node'));
    expect(err).toEqual(null);
    expect(res.includes('Hello node, response form provider')).toEqual(true);
  });

  it('test echo', async () => {
    const res = await demoService.echo();
    expect(res).toEqual({
      res: 'pang',
      err: null,
    });
  });

  it('test getUserInfo', async () => {
    const res = await demoService.getUserInfo(
      new UserRequest({
        id: 1,
        name: 'nodejs',
        email: 'node@qianmi.com',
      }),
    );
    expect(res).toEqual({
      err: null,
      res: {status: 'ok', info: {id: '1', name: 'test'}},
    });
  });
});

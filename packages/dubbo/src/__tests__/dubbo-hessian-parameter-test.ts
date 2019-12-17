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

import {Dubbo, setting} from 'dubbo-js';
import {DemoProvider} from './providers/org/apache/dubbo/demo/DemoProvider';

const service = {
  DemoProvider,
};

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

const dubbo = new Dubbo<typeof service>({
  application: {name: 'dubbo-js'},
  register: 'localhost:2181',
  service,
  dubboSetting,
});

//use middleware
dubbo.use(async function test(ctx, next) {
  const startTime = Date.now();
  await next();
  const endTime = Date.now();
  const {
    request: {dubboInterface, methodName},
  } = ctx;
  console.log(
    `hessian-check: invoke ${dubboInterface}#${methodName} costTime: ${endTime -
      startTime}`,
  );
});

describe('dubbo hessian parameter check test suite', () => {
  it('test sayHello', async () => {
    //@ts-ignore
    const {res, err} = await dubbo.service.DemoProvider.sayHello('node');
    expect(res).toEqual(null);
    expect(err != null).toEqual(true);
    expect(err.message).toMatch(/not all arguments are valid hessian type/);
  });
});

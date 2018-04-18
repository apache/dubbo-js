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
import java from 'js-to-java';
import log4js from 'log4js';
import {Dubbo} from '../dubbo';
import {TDubboCallResult} from '../types';

interface IDemoService {
  sayHello(name: string): TDubboCallResult<string>;

  echo(): TDubboCallResult<string>;

  test(): TDubboCallResult<void>;

  getUserInfo(): TDubboCallResult<{
    status: string;
    info: {id: number; name: string};
  }>;
}

const dubbo = new Dubbo({
  application: {name: '@qianmi/node-dubbo'},
  register: 'localhost:2181',
  dubboVersion: '2.0.0',
  interfaces: ['com.alibaba.dubbo.demo.DemoService'],
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

const demoService = dubbo.proxyService<IDemoService>({
  dubboInterface: 'com.alibaba.dubbo.demo.DemoService',
  version: '1.0.0',
  methods: {
    sayHello(name) {
      return [name];
    },
  },
});

describe('dubbo hessian parameter check test suite', () => {
  it('test sayHello', async () => {
    const {res, err} = await demoService.sayHello('node');
    expect(res).toEqual(null);
    expect(err != null).toEqual(true);
    expect(err.message).toMatch(/not all arguments are valid hessian type/);
  });
});

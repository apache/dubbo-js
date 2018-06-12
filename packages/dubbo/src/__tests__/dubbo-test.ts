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

import {dubboInvoker, matcher} from 'dubbo-invoker';
import {Dubbo, java} from 'dubbo2.js';
import {BasicTypeProvider} from './providers/com/alibaba/dubbo/demo/BasicTypeProvider';
import {DemoProvider} from './providers/com/alibaba/dubbo/demo/DemoProvider';
import {ErrorProvider} from './providers/com/alibaba/dubbo/demo/ErrorProvider';
import {TypeRequest} from './providers/com/alibaba/dubbo/demo/TypeRequest';
import {UserRequest} from './providers/com/alibaba/dubbo/demo/UserRequest';

const service = {
  BasicTypeProvider,
  DemoProvider,
  ErrorProvider,
};

const dubbo = new Dubbo<typeof service>({
  application: {name: '@qianmi/node-dubbo'},
  register: 'localhost:2181',
  service,
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
    `invoke ${dubboInterface}#${methodName} costTime: ${endTime - startTime}`,
  );
});

//dubbo-invoker set version
dubbo.use(
  dubboInvoker(
    matcher
      .match('com.alibaba.dubbo.demo.BasicTypeProvider', {
        version: '2.0.0',
      })
      .match('com.alibaba.dubbo.demo.DemoProvider', {version: '1.0.0'})
      .match('com.alibaba.dubbo.demo.ErrorProvider', {version: '1.0.0'}),
  ),
);

dubbo.subscribe({
  onReady() {
    console.log('onReady');
  },
  onSysError(err) {
    console.log(err);
  },
  onStatistics(stat) {
    console.log(stat);
  },
});

describe('demoService', () => {
  it('test sayHello', async () => {
    await dubbo.ready();

    // @ts-ignore
    const {res, err} = await dubbo.service.DemoProvider.sayHello(
      java.String('node'),
    );
    expect(err).toEqual(null);
    expect(res.includes('Hello node, response form provider')).toEqual(true);
  });

  it('test echo', async () => {
    const res = await dubbo.service.DemoProvider.echo();
    expect(res).toEqual({
      res: 'pang',
      err: null,
    });
  });

  it('test getUserInfo', async () => {
    const res = await dubbo.service.DemoProvider.getUserInfo(
      new UserRequest({name: 'nodejs', email: 'email'}),
    );
    expect(res).toEqual({
      err: null,
      res: {status: 'ok', info: {id: '1', name: 'test'}},
    });
  });
});

describe('typeBasicServer', () => {
  it('testBasicType', async () => {
    const reuslt = await dubbo.service.BasicTypeProvider.testBasicType(
      new TypeRequest({
        map: {
          hello: 'hello world',
          email: 'email@qianmi.com',
        },
        bigDecimal: {value: '100.00'},
      }),
    );
    expect(reuslt).toEqual({
      err: null,
      res: {
        bigDecimal: {value: '100.00'},
        map: {
          hello: 'hello world',
          email: 'email@qianmi.com',
        },
      },
    });
  });
});

const errorService = ErrorProvider(dubbo);

describe('error test', () => {
  it('test errorTest', async () => {
    const {res, err} = await errorService.errorTest();
    expect(err != null).toEqual(true);
    expect(res == null).toEqual(true);
  });
});

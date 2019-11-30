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

import Koa from 'koa';
import Router from 'koa-router';
import dubbo from './dubbo/dubbo-es6';

const app = new Koa();
const router = new Router();

router.get('/', ctx => {
  ctx.body = 'hello, dubbo.js';
});

router.get('/hello', async ctx => {
  const {res, err} = await dubbo.service.demoProvider.sayHello('test');
  console.log(await dubbo.service.basicTypeProvider.testBasicType());
  ctx.body = err ? err.message : res;
});

router.get('/user', async ctx => {
  const {res, err} = await dubbo.service.demoProvider.getUserInfo();
  ctx.body = res || err.message;
});

router.get('/echo', async ctx => {
  ctx.body = await dubbo.service.demoProvider.echo();
});

router.get('/type', async ctx => {
  const {res, err} = await dubbo.service.basicTypeProvider.testBasicType();
  ctx.body = res;
});

router.get('/exp', async ctx => {
  const {err, res} = await dubbo.service.errorProvider.errorTest();
  console.log(err);
  ctx.body = 'ok';
});

router.get('/tracer', async ctx => {
  const {res: hello} = await dubbo.service.demoProvider.sayHello('test');
  const {res: userInfo} = await dubbo.service.demoProvider.getUserInfo();

  setTimeout(async () => {
    await dubbo.service.basicTypeProvider.testBasicType();
    process.nextTick(() => {
      dubbo.service.demoProvider.getUserInfo();
    });
  });

  ctx.body = {
    hello,
    userInfo,
  };
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(3001);

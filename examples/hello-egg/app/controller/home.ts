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

import {java} from 'dubbo-js';
import {Controller} from 'egg';
import {Sex} from '../dubbo/providers/org/apache/dubbo/demo/Sex';
import {TypeRequest} from '../dubbo/providers/org/apache/dubbo/demo/TypeRequest';
import {UserRequest} from '../dubbo/providers/org/apache/dubbo/demo/UserRequest';

export default class HomeController extends Controller {
  async index() {
    const {ctx} = this;
    ctx.body = await ctx.service.test.sayHi('egg');
  }

  async userInfo() {
    const {
      res,
      err,
    } = await this.ctx.app.dubbo.service.DemoProvider.getUserInfo(
      new UserRequest({
        sex: Sex.female,
        email: 'coder.yang20100@gmail.com',
        name: 'yangxiaodong',
        id: 1001,
      }),
    );

    this.ctx.body = err ? err.message : res;
  }

  async sayHello() {
    const {res, err} = await this.ctx.app.dubbo.service.DemoProvider.sayHello(
      java.String('hello from node world'),
    );

    this.ctx.body = err ? err.message : res;
  }

  async echo() {
    const {res, err} = await this.ctx.app.dubbo.service.DemoProvider.echo();
    this.ctx.body = err ? err.message : res;
  }

  async basicType() {
    const {
      res,
      err,
    } = await this.ctx.app.dubbo.service.BasicTypeProvider.testBasicType(
      new TypeRequest({
        bigDecimal: {value: '100.00'},
        map: {hello: 'hello'},
      }),
    );
    this.ctx.body = err ? err.message : res;
  }
}

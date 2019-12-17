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

import {Context} from 'dubbo-js';
import matcher from '../matcher';

describe('matcher test suite', () => {
  it('test string match', () => {
    matcher.match('com.alibaba.dubbo.demo.DemoProvider', {
      version: '1.0.0',
      group: 'alibaba',
    });

    const param = matcher.invokeParam(<Context>{
      dubboInterface: 'com.alibaba.dubbo.demo.DemoProvider',
    });

    expect(param).toEqual({
      version: '1.0.0',
      group: 'alibaba',
    });
  });

  it('test predict fn match', () => {
    //setting match rule
    matcher.match((ctx: Context) => {
      if (ctx.dubboInterface === 'com.alibaba.dubbo.demo.ProductProvider') {
        ctx.version = '3.0.0';
        ctx.group = 'alibaba';
        return true;
      }
    });

    //expect match
    const ctx = <Context>{
      dubboInterface: 'com.alibaba.dubbo.demo.ProductProvider',
    };
    matcher.invokeParam(ctx);
    expect(ctx).toEqual({
      dubboInterface: 'com.alibaba.dubbo.demo.ProductProvider',
      version: '3.0.0',
      group: 'alibaba',
    });

    //not match
    const ctx1 = <Context>{
      dubboInterface: 'com.alibaba.dubbo.demo.GoodsProvider',
    };
    matcher.invokeParam(ctx1);
    expect(ctx1).toEqual({
      dubboInterface: 'com.alibaba.dubbo.demo.GoodsProvider',
    });
  });

  it('test RegExp match', () => {
    matcher.match(/^com.alibaba.dubbo.demo/, {
      version: '2.0.0',
      group: 'alibaba',
    });

    const param = matcher.invokeParam(<Context>{
      dubboInterface: 'com.alibaba.dubbo.demo.UserProvider',
    });

    expect(param).toEqual({
      version: '2.0.0',
      group: 'alibaba',
    });
  });

  it('test not match', () => {
    const param = matcher.invokeParam(<Context>{
      dubboInterface: 'com.dubbo.demo.ShoppingCart',
    });
    expect(param).toEqual(null);
  });
});

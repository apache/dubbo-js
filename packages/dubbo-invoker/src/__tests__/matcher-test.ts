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
import matcher from '../matcher';
import {Context} from 'dubbo2.js';

describe('matcher test suite', () => {
  it('test string match', () => {
    matcher.match('com.alibaba.dubbo.demo.DemoProvider', {
      version: '1.0.0',
      group: '',
    });

    const param = matcher.invokeParam({
      dubboInterface: 'com.alibaba.dubbo.demo.DemoProvider',
    } as Context);

    expect(param).toEqual({
      version: '1.0.0',
      group: '',
    });
  });

  it('test predict fn match', () => {
    matcher.match(
      (ctx: Context) => {
        //complex computed...
        return ctx.dubboInterface === 'com.alibaba.dubbo.demo.ProductProvider';
      },
      {
        version: '3.0.0',
        group: 'a',
      },
    );

    const param1 = matcher.invokeParam({
      dubboInterface: 'com.alibaba.dubbo.demo.ProductProvider',
    } as Context);

    expect(param1).toEqual({
      version: '3.0.0',
      group: 'a',
    });

    const param2 = matcher.invokeParam({
      dubboInterface: 'com.alibaba.dubbo.demo.GoodsProvider',
    } as Context);

    expect(param2).toEqual({
      version: '',
      group: '',
    });
  });

  it('test RegExp match', () => {
    matcher.match(/^com.alibaba.dubbo.demo/, {
      version: '2.0.0',
      group: '',
    });

    const param = matcher.invokeParam({
      dubboInterface: 'com.alibaba.dubbo.demo.UserProvider',
    } as Context);

    expect(param).toEqual({
      version: '2.0.0',
      group: '',
    });
  });

  it('test not match', () => {
    const param = matcher.invokeParam({
      dubboInterface: 'com.dubbo.demo.ShoppingCart',
    } as Context);

    expect(param).toEqual({
      version: '',
      group: '',
    });
  });
});

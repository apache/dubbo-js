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

import setting from '../setting';

describe('matcher test suite', () => {
  it('test string match', () => {
    setting.match('com.alibaba.dubbo.demo.DemoProvider', {
      version: '1.0.0',
      group: 'alibaba',
    });

    expect(
      setting.getDubboSetting('com.alibaba.dubbo.demo.DemoProvider'),
    ).toEqual({
      version: '1.0.0',
      group: 'alibaba',
    });
  });

  it('test array string match', () => {
    setting.match(
      [
        'com.alibaba.dubbo.demo.DemoProvider',
        'com.alibaba.dubbo.demo.ProductProvider',
      ],
      {version: '1.0.0', group: 'alibaba'},
    );

    expect(
      setting.getDubboSetting('com.alibaba.dubbo.demo.ProductProvider'),
    ).toEqual({
      version: '1.0.0',
      group: 'alibaba',
    });
  });

  it('test predict fn match', () => {
    //setting match rule
    setting.match((dubboInterface: string) => {
      if (dubboInterface === 'com.alibaba.dubbo.demo.ProductProvider1') {
        return {
          version: '3.0.0',
          group: 'alibaba',
        };
      }
    });

    expect(
      setting.getDubboSetting('com.alibaba.dubbo.demo.ProductProvider1'),
    ).toEqual({
      version: '3.0.0',
      group: 'alibaba',
    });

    //not match
    expect(
      setting.getDubboSetting('com.alibaba.dubbo.demo.GoodsProvider'),
    ).toEqual(null);
  });

  it('test RegExp match', () => {
    setting.match(/^com.alibaba.dubbo.demo/, {
      version: '2.0.0',
      group: 'alibaba',
    });

    expect(
      setting.getDubboSetting('com.alibaba.dubbo.demo.UserProvider'),
    ).toEqual({
      version: '2.0.0',
      group: 'alibaba',
    });
  });

  it('test not match', () => {
    expect(setting.getDubboSetting('com.dubbo.demo.ShoppingCart')).toEqual(
      null,
    );
  });
});

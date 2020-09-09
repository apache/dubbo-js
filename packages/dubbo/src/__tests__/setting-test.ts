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
    setting.match('org.apache.dubbo.demo.DemoProvider', {
      version: '1.0.0',
      group: 'apache',
    });

    expect(
      setting.getDubboSetting('org.apache.dubbo.demo.DemoProvider'),
    ).toEqual({
      version: '1.0.0',
      group: 'apache',
    });
  });

  it('test array string match', () => {
    setting.match(
      [
        'org.apache.dubbo.demo.DemoProvider',
        'org.apache.dubbo.demo.ProductProvider',
      ],
      {version: '1.0.0', group: 'apache'},
    );

    expect(
      setting.getDubboSetting('org.apache.dubbo.demo.ProductProvider'),
    ).toEqual({
      version: '1.0.0',
      group: 'apache',
    });
  });

  it('test predict fn match', () => {
    //setting match rule
    setting.match((dubboInterface: string) => {
      if (dubboInterface === 'org.apache.dubbo.demo.ProductProvider1') {
        return {
          version: '3.0.0',
          group: 'apache',
        };
      }
    });

    expect(
      setting.getDubboSetting('org.apache.dubbo.demo.ProductProvider1'),
    ).toEqual({
      version: '3.0.0',
      group: 'apache',
    });

    //not match
    expect(
      setting.getDubboSetting('org.apache.dubbo.demo.GoodsProvider'),
    ).toEqual(null);
  });

  it('test RegExp match', () => {
    setting.match(/^org.apache.dubbo.demo/, {
      version: '2.0.0',
      group: 'apache',
    });

    expect(
      setting.getDubboSetting('org.apache.dubbo.demo.UserProvider'),
    ).toEqual({
      version: '2.0.0',
      group: 'apache',
    });
  });

  it('test not match', () => {
    expect(setting.getDubboSetting('org.dubbo.demo.ShoppingCart')).toEqual(
      null,
    );
  });
});

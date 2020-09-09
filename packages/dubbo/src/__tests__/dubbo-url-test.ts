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

import DubboUrl from '../dubbo-url';

describe('dubbo url test suite', () => {
  it('test basic api', () => {
    const url = DubboUrl.from(
      'dubbo://172.19.36.38:20880/com.alibaba.dubbo.demo.DemoProvider?anyhost=true&application=demo-provider&dubbo=2.5.7&generic=false&interface=com.alibaba.dubbo.demo.DemoProvider&methods=sayHello,test,echo,getUserInfo&pid=23327&revision=1.0.0&side=provider&timeout=10000&timestamp=1526972402854&version=1.0.0',
    );

    expect(url.host).toEqual('172.19.36.38');
    expect(url.port).toEqual(20880);
    expect(url.path).toEqual('com.alibaba.dubbo.demo.DemoProvider');
    expect(url.dubboVersion).toEqual('2.5.7');
    expect(url.version).toEqual('1.0.0');
    expect(url.group).toEqual('');
  });

  it('test default version url', () => {
    const url = DubboUrl.from(
      'dubbo://172.19.36.38:20880/com.alibaba.dubbo.demo.DemoProvider?anyhost=true&application=demo-provider&dubbo=2.5.7&generic=false&interface=com.alibaba.dubbo.demo.DemoProvider&methods=sayHello,test,echo,getUserInfo&pid=23327&revision=1.0.0&side=provider&timeout=10000&timestamp=1526972402854&default.version=1.0.0',
    );

    expect(url.host).toEqual('172.19.36.38');
    expect(url.port).toEqual(20880);
    expect(url.path).toEqual('com.alibaba.dubbo.demo.DemoProvider');
    expect(url.dubboVersion).toEqual('2.5.7');
    expect(url.version).toEqual('1.0.0');
    expect(url.group).toEqual('');
  });
});

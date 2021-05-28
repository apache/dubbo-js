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

import { dubboSetting } from '../dubbo-setting'

describe('dubbo-service dubbo setting test suite', () => {
  it('test config string', () => {
    const cfg = dubboSetting
      .match('com.hello.a.service', { group: 'A', version: '1.0.0' })
      .match('com.hello.b.service', { group: 'b', version: '1.0.0' })

    expect(
      cfg.getDubboSetting({ dubboServiceInterface: 'com.hello.a.service' })
    ).toEqual({
      group: 'A',
      version: '1.0.0'
    })

    expect(
      cfg.getDubboSetting({ dubboServiceInterface: 'com.hello.b.service' })
    ).toEqual({
      group: 'b',
      version: '1.0.0'
    })

    expect(
      cfg.getDubboSetting({ dubboServiceInterface: 'com.hello.c.service' })
    ).toBeNull()
  })

  it('test config regx', () => {
    const cfg = dubboSetting
      .match(/com.hello.service*/, {
        group: 'regx',
        version: '1.0.0'
      })
      .match(/com.foo.service*/, { group: 'foo', version: '1.0.0' })

    expect(
      cfg.getDubboSetting({
        dubboServiceInterface: 'com.hello.service.addservice'
      })
    ).toEqual({
      group: 'regx',
      version: '1.0.0'
    })

    expect(
      cfg.getDubboSetting({
        dubboServiceInterface: 'com.foo.service.subservice'
      })
    ).toEqual({
      group: 'foo',
      version: '1.0.0'
    })

    expect(
      cfg.getDubboSetting({ dubboServiceInterface: 'com.other.service' })
    ).toBeNull()
  })

  it('test config thunk', () => {
    const cfg = dubboSetting.matchThunk((shortName: string) => {
      if (shortName === 'helloServiceGroupA') {
        return { group: 'A', version: '1.0.0' }
      }

      if (shortName === 'fooService2') {
        return { group: '2', version: '1.0.0' }
      }

      return null
    })

    expect(
      cfg.getDubboSetting({ dubboServiceShortName: 'helloServiceGroupA' })
    ).toEqual({
      group: 'A',
      version: '1.0.0'
    })

    expect(
      cfg.getDubboSetting({ dubboServiceShortName: 'fooService2' })
    ).toEqual({
      group: '2',
      version: '1.0.0'
    })

    expect(
      cfg.getDubboSetting({ dubboServiceShortName: 'barService' })
    ).toBeNull()
  })
})

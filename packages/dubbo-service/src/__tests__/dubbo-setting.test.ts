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

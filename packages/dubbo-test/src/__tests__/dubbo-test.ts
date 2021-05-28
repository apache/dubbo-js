import { Zk } from '@apache/dubbo-registry'
import { Dubbo, java } from '@apache/dubbo-consumer'
import { DubboService } from '@apache/dubbo-service'
import consumer from '../providers/org/apache/dubbo/demo/consumer'
import provider from '../providers/org/apache/dubbo/demo/provider'
import { UserRequest } from '../providers/org/apache/dubbo/demo/UserRequest'
import { TypeRequest } from '../providers/org/apache/dubbo/demo/TypeRequest'

let dubbo: Dubbo<typeof consumer> = null
let dubboService: DubboService = null
const zk = Zk({ connect: 'localhost:2182' })

beforeAll(async () => {
  dubboService = new DubboService({
    registry: zk,
    services: provider
  })

  await dubboService.ready()

  dubbo = new Dubbo<typeof consumer>({
    application: { name: 'dubbo-test' },
    registry: zk,
    services: consumer,
    dubboInvokeTimeout: 10 * 1000
  })
})

afterAll(async () => {
  dubbo.close()
  await dubboService.close()
})

describe('dubbo test suite', () => {
  it('test demo type provider', async () => {
    const hello = await dubbo.service.DemoProvider.sayHello(
      java.String('dubbo')
    )
    expect(hello.res).toEqual('hello dubbo')
    expect(hello.err).toBeNull()

    const echo = await dubbo.service.DemoProvider.echo()
    expect(echo.res).toEqual('pong')
    expect(echo.err).toBeNull()

    const test = await dubbo.service.DemoProvider.test()
    expect(test.res).toBeNull()
    expect(test.err).toBeNull()

    const userInfo = await dubbo.service.DemoProvider.getUserInfo(
      new UserRequest({
        id: 1,
        name: 'dubbo-js',
        email: 'hufeng@apache.org'
      })
    )
    expect(userInfo.res).toEqual({
      info: { id: '1', name: 'dubbo-js', email: 'hufeng@apache.org' },
      status: 'ok'
    })
  })

  it('test BasicTypeProvider ', async () => {
    const basicType = await dubbo.service.BasicTypeProvider.testBasicType(
      new TypeRequest({
        bigDecimal: { value: '1.0' },
        map: { ping: 'pong' }
      })
    )
    expect(basicType.res).toEqual({
      bigDecimal: { value: '1.0' },
      map: { ping: 'pong' }
    })
    expect(basicType.err).toBeNull()
  })

  it('test ErrorProvider', async () => {
    const result = await dubbo.service.ErrorProvider.errorTest()
    expect(result.res).toBeNull()
    expect(result.err.message).toEqual('exception')
  })
})

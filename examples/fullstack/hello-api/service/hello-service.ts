import { Dubbo, IDubboResult, java } from '@apache/dubbo-consumer'

export interface IHelloService {
  hello(name: string): Promise<IDubboResult<string>>
}

export const helloService = (dubbo: Dubbo): IHelloService =>
  dubbo.proxyService({
    dubboInterface: `org.apache.dubbojs.service.HelloService`,
    methods: {
      hello(name: string) {
        return [java.String(name)]
      }
    }
  }) as any

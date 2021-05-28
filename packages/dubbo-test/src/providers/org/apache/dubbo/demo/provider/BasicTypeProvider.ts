import { IDubboService } from '@apache/dubbo-service'
import { TypeRequest } from '../TypeRequest'

export class BasicTypeProvider implements IDubboService {
  dubboInterface = 'org.apache.dubbo.demo.BasicTypeProvider'

  methods = {
    testBasicType: this.testBasicType
  }

  testBasicType(request: TypeRequest): Promise<TypeRequest> {
    console.log(request)
    return Promise.resolve(new TypeRequest(request) as any)
  }
}

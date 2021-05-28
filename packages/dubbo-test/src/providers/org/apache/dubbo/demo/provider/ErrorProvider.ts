import { IDubboService } from '@apache/dubbo-service'

export class ErrorProvider implements IDubboService {
  dubboInterface = 'org.apache.dubbo.demo.ErrorProvider'
  methods = {
    errorTest: this.errorTest
  }

  errorTest() {
    throw new Error('exception')
  }
}

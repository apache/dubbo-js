import { IDubboService } from '@apache/dubbo-service'
import { UserRequest } from '../UserRequest'
import { UserResponse } from '../UserResponse'

export class DemoProvider implements IDubboService {
  dubboInterface = 'org.apache.dubbo.demo.DemoProvider'
  methods = {
    sayHello: this.sayHello,
    echo: this.echo,
    test: this.test,
    getUserInfo: this.getUserInfo
  }

  sayHello(name: string) {
    return `hello ${name}`
  }

  echo() {
    return 'pong'
  }

  test() {
    console.log('test')
  }

  getUserInfo(request: UserRequest): Promise<UserResponse> {
    const response = new UserResponse({
      status: 'ok',
      info: {
        id: '1',
        name: request.name,
        email: request.email
      }
    })
    return Promise.resolve(response.__fields2java() as any)
  }
}

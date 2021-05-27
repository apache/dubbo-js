export default class HelloService {
  dubboInterface = 'org.apache.dubbojs.service.HelloService'

  methods = {
    hello: this.hello
  }

  async hello(name: string) {
    return Promise.resolve(`hello ${name} from node with pid ${process.pid}`)
  }
}

import { DubboClient } from 'apahce-dubbo3-client'

export interface IHelloService {
  sayHello(
    id:number,
    name:string,
    email:string,
    password:string
  ):Promise<string>

  getUser(id:number):Promise<string>
}

export const HelloService = (b:DubboClient):IHelloService => {
  b.proxyService({
    name:'HelloService',
    methods:{
      async sayHello( id:number, name:string,email:string, password:string){
        return [id, name, email, password]
      },
      async getUser(id:number){
        return [id]
      }
    }
  })
}
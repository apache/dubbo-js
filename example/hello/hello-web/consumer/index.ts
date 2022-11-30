import { Dubbo } from 'dubbo3-client'

export interface IHelloService {
  sayHello(
    id:number,
    name:string,
    email:string,
    password:string
  ):Promise<string>

  getUser(id:number):Promise<string>
}

export const HelloService = (b:Dubbo):IHelloService => {
  b.proxyService({
    name:'HelloService',
    methods:{
      sayHello( id:number, name:string,email:string, password:string){
        return [id, name, email, password]
      },
    
      getUser(id:number){
        return [id]
      }
    }
  })
}
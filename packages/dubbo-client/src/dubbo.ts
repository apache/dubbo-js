interface DubboClientProp {
    services: { [name: string]: any }
  }
  
  import Context from './context'
  import { IDubboService, TDubboService } from './types'
  // import compose from 'koa-compose'
  
  export default class DubboClient<T = object> {
    // private status
    public readonly services: TDubboService<T>
  
    constructor(props: IDubboProps) {
      // init service
      this.services = <TDubboService<T>>{}
  
      this.collectService(props.services)
    }
    // 返回元数据
    proxyService<T>(service: IDubboService): T {
      return service as T
    }
  
    // 收集servive
    private collectService(services: { [name: string]: any }) {
      // 基于配置获取元信息
      for (let [name, serviceProxy] of Object.entries(services)) {
        const service = serviceProxy(this)
        service.shortName = name
        this.services[name] = this.composeService(service)
      }
    }
    // private handleInvoke = async (ctx: Context) => {
    //   ctx.body = await this.queue.add(ctx)
    // }
    private composeService(service: IDubboService) {
      const { path, methods } = service
      const proxyMethods = new Object()
      for (let [name, method] of Object.entries(methods)) {
        proxyMethods[name] = (args: Array<any>) => {
          const ctx = new Context()
          ctx.path = path
          ctx.args = args || []
          // 合成执行方法
          // const fn = compose([this.handleInvoke])
          await fn(ctx)
          return ctx.body
        }
      }
      return proxyMethods
    }
  }
  
  //
  
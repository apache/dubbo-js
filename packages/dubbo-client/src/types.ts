export type TServiceName = string
export type TConsumerUrl = string

export interface IDubboProps {
  // path
  path: string
  //注册到dubbo容器服务对象
  services: { [name: string]: any }
}

export type IDubboMethod = {
  path: string
  method: Function
}

export interface IDubboService {
  path: string
  methods: Object
}

export type TDubboService<T> = {
  [k in keyof T]: T[k] extends (dubbo: any) => infer R ? R : any
}

import DubboClient from './../dubbo'
import stubService from './stubServices'
import { DubboClientsTstubService } from './mvpService'
// const dubbo = new DubboClient<IMvp>({services:stubService})
const dubbo = new DubboClient<DubboClientsTstubService>(stubService)
dubbo.services.mvp.SayHello({ name: 'hello' })

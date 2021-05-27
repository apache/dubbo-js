import Koa from 'koa'
import { Dubbo } from '@apache/dubbo-consumer'
import { Zk } from '@apache/dubbo-registry'
import service from './service'

const dubbo = new Dubbo<typeof service>({
  application: {
    name: 'hello-api'
  },
  registry: Zk({ connect: 'localhost:2181' }),
  service
})

const server = new Koa()
server.use(async (ctx) => {
  const { res, err } = await dubbo.service.helloService.hello('dubbo-js')
  console.log(res, err)
  ctx.body = {
    res,
    err: err?.message
  }
})
server.listen(3000)
console.log('hello-api start at port 3000')

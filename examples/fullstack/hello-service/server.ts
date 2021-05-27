import { DubboService } from '@apache/dubbo-service'
import { Zk } from '@apache/dubbo-registry'
import services from './service'
;(async function main() {
  const dubbo = new DubboService({
    registry: Zk({ connect: 'localhost:2181' }),
    services
  })
  await dubbo.ready()
  console.log('dubbo server start....')
})()

import { DubboRouter } from '@apachedubbo/dubbo'
import { ExampleService } from './gen/example_dubbo'

export default (router: DubboRouter) =>
  // registers apache.dubbo.demo.example.v1
  router.service(
    ExampleService,
    {
      // implements rpc Say
      async say(req) {
        return {
          sentence: `You said: ${req.sentence}`
        }
      }
    },
    { serviceGroup: 'dubbo', serviceVersion: '1.0.0' }
  )

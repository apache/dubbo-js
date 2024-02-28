import { createPromiseClient } from '@apachedubbo/dubbo'
import { ExampleService } from './gen/example_dubbo'
import { createDubboTransport } from '@apachedubbo/dubbo-node'

const transport = createDubboTransport({
  baseUrl: 'http://localhost:8080',
  httpVersion: '1.1'
})

async function main() {
  const client = createPromiseClient(ExampleService, transport, {
    serviceVersion: '1.0.0',
    serviceGroup: 'dubbo'
  })
  const res = await client.say({ sentence: 'Hello World' })
  console.log(res)
}
void main()

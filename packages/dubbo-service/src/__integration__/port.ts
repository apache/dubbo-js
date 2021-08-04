import cluster from 'cluster'
import { portManager } from '../port'

if (cluster.isMaster) {
  for (let i = 0; i < 4; i++) {
    cluster.fork()
  }
  cluster.on('exit', () => {
    console.log('fork')
    cluster.fork()
  })
} else {
  ;(async () => {
    console.log('pid start---->', process.pid)
    const port = await portManager.getReusedPort()
    console.log(port)
  })()
}

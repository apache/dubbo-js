/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import path from 'path'
import cluster from 'cluster'
import getPort from 'get-port'
import debug from 'debug'
import fs from 'fs-extra'
import lockfile from 'proper-lockfile'

const dlog = debug('dubbo-server:get-port')
const ROOT = path.join(process.cwd(), '.dubbojs')
const LOCK_FILE = path.join(ROOT, 'dubbo')

export class PortManager {
  private port: number

  constructor() {
    if (this.isMasterProcess) {
      // create dubbo lock file
      fs.ensureFileSync(LOCK_FILE)
    }
    // listen process exit event
    // and clean port/pid file content
    this.clearPidPort()
  }

  async getReusedPort(): Promise<number> {
    try {
      // set file lock
      const release = await lockfile.lock(LOCK_FILE, {
        retries: { retries: 5, maxTimeout: 5000 }
      })
      dlog('pid %d get lock', process.pid)
      // find available reused port
      const dirs = await fs.readdir(ROOT)
      dlog('scan %s dir includes %O', ROOT, dirs)
      const excludes = []
      const portPidFiles = dirs.filter((dir) => !dir.startsWith('dubbo'))
      for (let portPid of portPidFiles) {
        const file = fs.readFileSync(path.join(ROOT, portPid)).toString()
        if (file === '') {
          fs.writeFileSync(path.join(ROOT, portPid), String(process.pid))
          this.port = Number(portPid)
          await release()
          return this.port
        } else {
          excludes.push(Number(portPid))
        }
      }

      this.port = await this.getFreePort(excludes)
      fs.writeFileSync(path.join(ROOT, String(this.port)), String(process.pid))
      await release()
      return this.port
    } catch (err) {
      throw err
    }
  }

  async getFreePort(exclude: Array<number> = []) {
    const ports = []
    for (let i = 0; i < 10; i++) {
      // gen new port
      const port = await getPort({ port: getPort.makeRange(20888, 30000) })
      ports.push(port)
    }

    const availablePort = ports.filter((port) => !exclude.includes(port))[0]
    dlog(
      'get random port %d in %s mode',
      availablePort,
      this.isMasterProcess ? 'master' : 'worker'
    )
    return availablePort
  }

  clearPidPort = () => {
    const cleanup = () => {
      const pid = process.pid
      dlog('clear port pid %d', pid)
      fs.writeFileSync(path.join(ROOT, String(this.port)), '')
    }
    ;[
      'exit',
      'SIGINT',
      'SIGUSR2',
      'SIGUSR1',
      'SIGKILL',
      'SIGTERM',
      'uncaughtException'
    ].forEach((event) => {
      dlog('bind %s event', event)
      process.on(event, cleanup)
    })
  }

  get isMasterProcess() {
    const isClusterMode = cluster.isMaster
    const isPm2MasterMode =
      process.env.NODE_APP_INSTANCE && process.env.NODE_APP_INSTANCE === '0'
    return isClusterMode || isPm2MasterMode
  }
}

export const portManager = new PortManager()

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
import getPort from 'get-port'
import debug from 'debug'
import fs from 'fs-extra'
import lockfile from 'proper-lockfile'

const dlog = debug('dubbo-server:get-port')
// port cache file
const ROOT = path.join(process.cwd(), '.dubbojs')
// dubbo lock file path
const LOCK_FILE = path.join(__dirname, '..', '.dubbo')

export class PortManager {
  private port: number

  constructor() {
    // listen process exit event and clean port/pid file content
    this.clearPidPort()
  }

  async getReusedPort(): Promise<number> {
    // set file lock
    const release = await lockfile.lock(LOCK_FILE, {
      retries: { retries: 5, maxTimeout: 5000 }
    })
    dlog('pid %d get lock', process.pid)
    fs.ensureDirSync(ROOT)
    // find available reused port
    const dirs = await fs.readdir(ROOT)
    dlog('scan %s dir includes %O', ROOT, dirs)
    const excludes = []
    for (let portPid of dirs) {
      const fullFilePath = path.join(ROOT, portPid)
      // if current file name not number
      // delete it, because it was invalid file
      if (!/\d+/.test(portPid)) {
        fs.rmSync(fullFilePath)
        continue
      }

      // if current file content was empty
      // the file name port was reused
      const file = fs.readFileSync(fullFilePath).toString()
      if (file === '') {
        // write current port
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
  }

  async getFreePort(exclude: Array<number> = []) {
    const ports = []
    for (let i = 0; i < 10; i++) {
      const port = await getPort({ port: getPort.makeRange(20888, 30000) })
      ports.push(port)
    }

    const availablePort = ports.filter((port) => !exclude.includes(port))[0]
    dlog('get random port %d', availablePort)
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
      'SIGTERM',
      'uncaughtException'
    ].forEach((event) => {
      dlog('bind %s event', event)
      process.on(event, cleanup)
    })
  }
}

export const portManager = new PortManager()

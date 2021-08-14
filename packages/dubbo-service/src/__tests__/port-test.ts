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

import cluster from 'cluster'
import path from 'path'
import fs from 'fs-extra'
import { portManager } from '../port'

describe('port test suite', () => {
  it('test master process', async () => {
    const port = await portManager.getReusedPort()
    expect(port).toBeTruthy()
    expect(fs.existsSync(path.join(process.cwd(), '.dubbojs'))).toBeTruthy()
    fs.unlinkSync(path.join(process.cwd(), '.dubbojs', `${port}`))
  })

  it('test cluster mode', async () => {})
})

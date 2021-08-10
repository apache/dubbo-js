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

import fs from 'fs-extra'
import glob from 'glob'

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ util ~~~~~~~~~~~~~~~~~~~~~~~~~~
const globFiles = (): Promise<Array<string>> => {
  return new Promise((resolve, reject) => {
    glob(
      '**/*[!.d].+(ts|java|js|sh|xml|yml|properties)',
      {
        ignore: [
          '**/node_modules/**',
          '**/lib/**',
          '**/target/**',
          '**/check-copyright.ts'
        ]
      },
      (err, files) => {
        if (err) {
          reject(err)
          return
        }
        resolve(files)
      }
    )
  })
}

export default async function checkCopyright() {
  const files = await globFiles()
  return (
    await Promise.all(
      files.map(async (file) => {
        const content = (await fs.readFile(file)).toString()
        if (
          content.includes('Copyright 1999-2018 Alibaba Group Holding Ltd.')
        ) {
          return file
        }
      })
    )
  ).filter(Boolean)
}

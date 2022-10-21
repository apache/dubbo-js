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
import glob from 'glob'
import fs from 'fs-extra'
import chalk from 'chalk'
import license from './license'

const IGNORE = {
  ignore: ['**/node_modules/**', '**/lib/**', '**/target/**']
}
const SCAN_FILE_PATTERN = '**/*[!.d].+(ts|java|js|sh|xml|yml|properties)'

async function scanFiles() {
  // get files
  const files: string[] = await new Promise((resolve, reject) => {
    glob(SCAN_FILE_PATTERN, IGNORE, (err, files) => {
      if (err) {
        reject(err)
        return
      }
      resolve(files)
    })
  })

  // get buffer
  const buffers = await Promise.all(
    files.map((file) => fs.readFile(file, 'utf-8'))
  )

  // reduce
  const map = new Map<string, string>()
  for (let i = 0, len = files.length; i < len; i++) {
    map.set(files[i], buffers[i].toString())
  }
  return map
}

/**
 *
 * @param file
 * @returns
 */
function fileExt(file: string) {
  return path.extname(file).substring(1)
}

/**
 * check file apache license
 */
export async function checkLicense() {
  const invalidFiles = new Map<string, string>()

  // 1. specify scan scope
  const map = await scanFiles()

  // 2. check weather include license or not
  for (let [file, content] of map) {
    const ext = fileExt(file)
    const hasLicense = content.includes(license[ext])
    if (!hasLicense) {
      invalidFiles.set(file, content)
    }
  }

  return invalidFiles
}

/**
 * check notice file
 * @returns
 */
export function checkNotice() {
  const notice = fs.readFileSync('NOTICE').toString()
  const isMatch = /2018-(\d+)/.test(notice)
  if (!isMatch) {
    return new Error(`Could not find any date pattern`)
  }

  const [pattern, endYear] = notice.match(/2018-(\d+)/)
  const year = new Date().getFullYear()
  if (Number(endYear) !== year) {
    return new Error(`notice ${pattern} end year ${endYear} != ${year}`)
  }
}

/**
 * fixed license issue file
 */
export async function fixedFileLicense() {
  const invalidFiles = await checkLicense()

  const writeFiles = []

  for (let [file, content] of invalidFiles) {
    writeFiles.push(
      new Promise(async (resolve) => {
        const ext = fileExt(file)
        const lic = license[ext]
        await fs
          .writeFile(file, `${lic}\n\n${content}`)
          .then(() => {
            console.log(chalk.greenBright(`${file} fixed ok`))
          })
          .catch((err) => {
            console.log(chalk.red(`fixed ${file} err: ${err}`))
          })
        resolve(null)
      })
    )
  }

  await Promise.all(writeFiles)
}

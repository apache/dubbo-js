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

import { join } from 'path'
import { exec } from 'child_process'
import fs from 'fs-extra'
import chalk from 'chalk'
import pkg from '../../package.json'
import { checkLicense } from './check-license'
import checkNotice from '../feature/check-notice'
import checkCopyright from '../feature/check-copyright'

const log = (str: string) => console.log(chalk.greenBright(str))
const logErr = (err: Error | string) => console.log(chalk.redBright(err))
const sh = (str: TemplateStringsArray, ...keys: Array<string>) => {
  const shell = str.reduce((r, v, i) => {
    r += v
    if (i < keys.length) {
      r += keys[i]
    }
    return r
  }, '')
  return new Promise((resolve, reject) => {
    log(`run shell => \n${shell}`)
    exec(shell, (err, stdout, stderr) => {
      if (err) {
        reject(err)
        return
      }
      log(stdout)
      logErr(stderr)
      resolve(stdout || stderr)
    })
  })
}

/**
 * source code release， auto pipeline
 * install before prepare release:
 * - maven
 * - ts-node
 * - lerna
 */

export async function prepareRelease(dest: string) {
  log(`current cwd ${process.cwd()}`)
  log(`- check notice year`)
  const err = checkNotice()
  if (err) {
    logErr(err)
    return
  }

  log(`- check license`)
  const loseLicenseFiles = await checkLicense()
  if (loseLicenseFiles.length > 0) {
    return
  }

  log(`- check copyright`)
  const problem = await checkCopyright()
  if (problem.length > 0) {
    logErr(problem.join(','))
    return
  }

  // copy current project to dest dir
  const outputDir = join(dest, 'dubbo-js')
  log(`\n- export dubbo-js => ${outputDir} dir`)
  fs.copySync('.', outputDir)

  // clean each module lib
  log(`\n- clean node_modules`)
  await sh`
    cd ${outputDir}
    lerna clean -y
    rm -rf node_modules
  `

  // clean .git
  log(`\n- clean .git`)
  await sh`
    cd ${outputDir}
    rm -rf .git
  `

  // clean __MACOSX and .DS_Store
  log(`\n- clean __MACOSX and .DS_Store`)
  await sh`
    cd ${outputDir}
    find . | grep .DS_Store | xargs rm
    find . | grep __MACOSX | xargs rm
  `

  // clean java target class
  log(`\n- clean dubbo-demo`)
  await sh`
    cd ${outputDir}/dubbo-java/dubbo-demo 
    mvn clean
  `

  // clean example node_modules
  log(`\n- clean example node_modules`)
  await sh`
    cd ${outputDir}
    rm -rf fullstack/node_modules
    rm -rf hello-egg/node_modules
    rm -rf hello-koa/node_modules
    rm -rf hello-midway/node_modules
  `

  // clean misc files
  log(`\n- clean misc files`)
  await sh`
  cd ${outputDir}
  rm package-lock.json
  rm -rf package-lock.json
  rm -rf .idea
  rm -rf coverage
  rm -rf examples/hello-egg/typings
  rm -rf examples/hello-midway/src/typings
  rm -rf dubbo-java/nacos-docker/example/standalone-logs/
  `

  // zip source dir
  log(`\n- zip dubbo-js dir`)
  await sh`
    cd ${dest}
    zip -r apache-dubbo-js-${pkg.version}-source-release.zip dubbo-js 
    shasum -a 512 apache-dubbo-js-${pkg.version}-source-release.zip >> apache-dubbo-js-${pkg.version}-source-release.zip.sha512
    gpg -ab apache-dubbo-js-${pkg.version}-source-release.zip
    gpg --verify apache-dubbo-js-${pkg.version}-source-release.zip.asc apache-dubbo-js-${pkg.version}-source-release.zip 
  `
}

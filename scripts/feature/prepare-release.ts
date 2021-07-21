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
import chalk, { stderr } from 'chalk'
import { checkLicense } from './check-license'
import { join } from 'path'
import { exec } from 'child_process'
import pkg from '../../package.json'

/**
 * source code release， auto pipeline
 * install before prepare release:
 * - maven
 * - ts-node
 * - lerna
 */

export async function prepareRelease(dest: string) {
  console.log(chalk.greenBright(`- check license`))
  // check license
  const noLicenseFiles = await checkLicense()
  if (noLicenseFiles.length > 0) {
    return
  }

  // copy current project to dest dir
  const outputDir = join(dest, 'dubbo-js')
  console.log(chalk.greenBright(`\n- export dubbo-js to ${outputDir} dir`))
  fs.copySync('../', outputDir)

  // clean each module lib
  console.log(chalk.greenBright(`\n- clean node_modules`))
  await sh`
    cd ${outputDir}
    lerna clean -y
    rm -rf node_modules
  `

  // clean .git
  console.log(chalk.greenBright(`\n- clean .git`))
  await sh`
    cd ${outputDir}
    rm -rf .git
  `

  // clean __MACOSX and .DS_Store
  console.log(chalk.greenBright(`\n- clean __MACOSX and .DS_Store`))
  await sh`
    cd ${outputDir}
    find . | grep .DS_Store | xargs rm
    find . | grep __MACOSX | xargs rm
  `

  // clean java target class
  console.log(chalk.greenBright(`\n- clean dubbo-demo`))
  await sh`
    cd ${outputDir}/dubbo-java/dubbo-demo 
    mvn clean
  `

  // clean example node_modules
  console.log(chalk.greenBright(`\n- clean example node_modules`))
  await sh`
    cd ${outputDir}
    rm -rf fullstack/node_modules
    rm -rf hello-egg/node_modules
    rm -rf hello-koa/node_modules
    rm -rf hello-midway/node_modules
  `

  // clean misc files
  console.log(chalk.greenBright(`\n- clean misc files`))
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
  console.log(chalk.greenBright(`\n- zip dubbo-js dir`))
  await sh`
    cd ${dest}
    zip -r apache-dubbo-js-${pkg.version}-source-release.zip ${outputDir}
    shasum -a 512 apache-dubbo-js-${pkg.version}-source-release.zip >> apache-dubbo-js-${pkg.version}-source-release.zip.sha512
    gpg -ab apache-dubbo-js-${pkg.version}-source-release.zip
    gpg --verify apache-dubbo-js-${pkg.version}-source-release.zip.asc apache-dubbo-js-${pkg.version}-source-release.zip 
  `
}

function sh(str: TemplateStringsArray, ...keys: Array<string>) {
  const shell = str.reduce((r, v, i) => {
    r += v
    if (i < keys.length) {
      r += keys[i]
    }
    return r
  }, '')
  return new Promise((resolve, reject) => {
    console.log(chalk.greenBright(shell))
    exec(shell, (err, stdout, stderr) => {
      if (err) {
        reject(err)
        return
      }
      console.log(chalk.greenBright(stdout || stderr))
      resolve(stdout || stderr)
    })
  })
}

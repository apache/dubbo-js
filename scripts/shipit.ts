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

import chalk from 'chalk'
import { Command } from 'commander'
import { sourceRelease } from './cmd-release-source'
import npmRelease from './cmd-release-npm'
import { checkLicense, checkNotice, fixedFileLicense } from './cmd-check-source'

const program = new Command()

program
  .version('1.0.0', '-v, --version', 'output the current version')
  .description('🚀 dubbo-js shipit tools 🚀')

// check license
program
  .command('check')
  .description('check file license')
  .action(async () => {
    // check notice
    checkNotice()
    // check license
    const invalidFiles = await checkLicense()
    if (invalidFiles.size === 0) {
      console.log(chalk.greenBright(`Yes, All file have apache license`))
    } else {
      for (let [file] of invalidFiles) {
        console.log(chalk.yellowBright(`${file} => have not apache license`))
      }
    }
  })

// fixed notice and license
program
  .command('fix')
  .description('fixed notice and license issues')
  .action(async () => {
    await fixedFileLicense()
  })

// source release
program
  .command('source-release [dest]')
  .description('source source release')
  .action(async (dest: string = '/tmp') => {
    const invalidFiles = await checkLicense()

    if (invalidFiles.size >= 0) {
      console.log(chalk.yellowBright(`These files have not apache license`))
      console.log(chalk.yellowBright(`${[...invalidFiles.keys()].join(`\n`)}`))
      console.log(chalk.redBright(`please fixed those issues.`))
      return
    }
    await sourceRelease(dest)
  })

// npm release
program
  .command('npm-release')
  .description('npm module release')
  .action(() => {
    npmRelease([
      './package/dubbo-common',
      './package/dubbo-registry',
      './package/dubbo-serialization',
      './package/dubbo-service',
      './package/dubbo-consumer'
    ])
      .then(() => {
        console.log(`release ok.`)
      })
      .catch((err) => {
        console.log(err)
      })
  })

program.parse(process.argv)

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

import { Command } from 'commander'
import { checkLicense, fixedFileLicense } from './feature/check-license'
import { prepareRelease } from './feature/prepare-release'

const program = new Command()

program
  .version('1.0.0', '-v, --version', 'output the current version')
  .description('🚀 dubbo-js shipit tools 🚀')

program
  .command('check-license [fixed]')
  .description('check file license')
  .action(async (fixed = '') => {
    if (fixed !== 'fixed') {
      checkLicense()
    } else {
      fixedFileLicense()
    }
  })

program
  .command('prepare-release [dest]')
  .description('prepare source release')
  .action((dest: string = '/tmp') => {
    prepareRelease(dest)
  })

program.parse(process.argv)

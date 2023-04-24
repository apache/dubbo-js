#!/usr/bin/env node
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

// @ts-nocheck

import program from 'commander'
import debug from 'debug'
import { readFile, writeFile } from 'fs-extra'
import klaw from 'klaw'
import prettier from 'prettier'
import Config from './config'
import { extra } from './ext'
import { Request } from './request'

const log = debug('j2t:cli')

program
  .version('0.0.1')
  .usage('-c dubbo.json')
  .option('-c, --config [value]', 'specify interpret Config ')
  .action(async (config) => {
    // read config file
    const dubboConfig = await Config.fromConfigPath(config).catch((err) => {
      console.error('Failed to read config file')
      throw err
    })

    // extra  ast from java class
    const extInfo = await extra(dubboConfig).catch((err) => {
      console.error('Failed to extract ast from java class')
      throw err
    })

    //setup jar ast path
    console.log('read jar ast file', extInfo.jarInfo)
    dubboConfig.jarInfo = extInfo.jarInfo
    log(`parse config->${JSON.stringify(dubboConfig, null, 2)}`)

    await Request.from(dubboConfig).run()
    await formatSourceDir(dubboConfig.output)
    console.log('Translation completed')
  })
  .parse(process.argv)

/**
 * Format the source code
 * @param src
 * @returns {Promise}
 */
async function formatSourceDir(src: string): Promise<any> {
  const fmt = function (str: string) {
    prettier.format(str, {
      parser: 'typescript',
      singleQuote: true,
      bracketSpacing: false,
      trailingComma: 'all',
      semi: false
    })
  }

  log(`Format source code dir:${src}`)
  return new Promise((resolve, reject) => {
    klaw(src)
      .on('data', async (item: klaw.Item) => {
        if (!item.path.endsWith('.ts')) {
          return
        }

        try {
          let fileContent = await readFile(item.path)
          await writeFile(item.path, fmt(fileContent.toString()))
          log(`Format the source code successfully:${item.path}`)
        } catch (err) {
          log(`Failed to format the source code:${item.path} ${err}`)
          console.warn(`Failed to format the source code:${item.path} ${err}`)
          reject(err)
        }
      })
      .on('end', () => {
        resolve(undefined)
      })
  })
}

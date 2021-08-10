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
import prettier from 'prettier'

const prettierConfig = fs.readJSONSync('.prettierrc')

const LICENSE = `/*
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
 */`

const SHELL_LICENSE = `# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.`

const XML_LICENSE = `<!--
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
-->`

const meta = {
  js: {
    license: LICENSE,
    prettier: true
  },
  ts: {
    license: LICENSE,
    prettier
  },
  java: {
    license: LICENSE,
    prettier: false
  },
  sh: {
    license: SHELL_LICENSE,
    prettier: false
  },
  yml: {
    license: SHELL_LICENSE,
    prettier: false
  },
  xml: {
    license: XML_LICENSE,
    prettier: false
  },
  properties: {
    license: SHELL_LICENSE,
    prettier: false
  }
}

/**
 * check file apache license
 */
export async function checkLicense() {
  const haveNoLicenceFiles = []

  // 1. specify scan scope
  const files = await globFiles()

  // 2. check weather include license or not
  for await (let { file, content } of asyncReadFiles(files)) {
    const cfg = getMeta(file)
    const hasLicense = content.includes(cfg.license)
    if (!hasLicense) {
      console.log(chalk.yellowBright(`${file} => have not apache license`))
      haveNoLicenceFiles.push({ file, content })
    }
  }

  // fixed
  if (haveNoLicenceFiles.length === 0) {
    console.log(chalk.greenBright(`Yes, All file have apache license`))
  }

  return haveNoLicenceFiles
}

/**
 * fixed license issue file
 */
export async function fixedFileLicense() {
  const haveNoLicenceFiles = await checkLicense()
  console.log(`\nfixed......`)
  for await (let { file } of asyncWriteFiles(haveNoLicenceFiles)) {
    console.log(chalk.greenBright(`${file} fixed ok`))
  }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ util ~~~~~~~~~~~~~~~~~~~~~~~~~~
function globFiles(): Promise<Array<string>> {
  return new Promise((resolve, reject) => {
    glob(
      '**/*[!.d].+(ts|java|js|sh|xml|yml|properties)',
      {
        ignore: ['**/node_modules/**', '**/lib/**', '**/target/**']
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

function* asyncReadFiles(files: Array<string>) {
  for (let file of files) {
    yield fs.readFile(file).then((res) => ({
      file,
      content: res.toString()
    }))
  }
}

function* asyncWriteFiles(files: Array<{ file: string; content: string }>) {
  for (let { file, content } of files) {
    const cfg = getMeta(file)
    if (cfg.prettier) {
      yield fs
        .writeFile(
          file,
          prettier.format(`${cfg.license}\n\n${content}`, {
            ...prettierConfig,
            parser: 'typescript'
          } as any)
        )
        //@ts-ignore
        .then(() => ({
          file
        }))
    } else {
      // 如果是xml
      if (
        cfg.license === XML_LICENSE &&
        content.includes(`<?xml version="1.0" encoding="UTF-8"?>`)
      ) {
        const [firstLine, ...rest] = content.split('\n')
        yield fs
          .writeFile(file, `${firstLine}\n${XML_LICENSE}\n${rest.join('\n')}`)
          .then(() => ({ file }))
        return
      }

      yield fs
        .writeFile(file, `${cfg.license}\n\n${content}`)
        //@ts-ignore
        .then(() => ({
          file
        }))
    }
  }
}

function getMeta(file: string): { license: string; prettier: boolean } {
  const ext = path.extname(file).substring(1)
  return meta[ext]
}

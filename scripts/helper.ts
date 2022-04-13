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

import 'zx/globals'
import { join } from 'path'
import fs from 'fs-extra'
import glob from 'glob'

export type TPkgs = Array<{
  pkg: { name: string; version: string }
  upgradeVersion: string
  deps: Array<{ moduleName: string; version: string }>
}>

const cwd = process.cwd()

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

export async function checkCopyright() {
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

export async function npmPublish({
  moduleName,
  version,
  deps = []
}: {
  moduleName: string
  version: string
  deps?: Array<{ moduleName: string; version: string }>
}) {
  if (version === '') {
    console.log(`skip => ${moduleName}.`)
    return
  }

  // 设置package.json的version
  const packageJson = require(join(
    cwd,
    `./packages/${moduleName}/package.json`
  ))
  packageJson.version = version
  for (const dep of deps) {
    packageJson.dependencies[dep.moduleName] = `^${dep.version}`
  }

  // write
  const packageJsonPath = `./packages/${moduleName}/package.json`
  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2))
  console.log(`write => ${packageJsonPath}`)

  await $`cd packages/${moduleName} && npm publish`.pipe(process.stderr)
}

export async function publish(pkgs: TPkgs) {
  for (let item of pkgs) {
    const upgradeVersion = await question(
      `Release module => ${item.pkg.name} / current version => ${item.pkg.version}\nPress [Enter] skip Release\n`
    )
    item['upgradeVersion'] = upgradeVersion.trim()
  }

  // check version
  if (pkgs.every((item) => !item.upgradeVersion)) {
    console.log(`skip all module release`)
    return
  }

  const baseModule = pkgs
    .filter((item) => !item.deps || item.deps.length === 0)
    .reduce((r, e) => {
      r[e.pkg.name] = e.upgradeVersion
      return r
    }, {})

  // update deps
  pkgs
    .filter((item) => item.deps && item.deps.length > 0)
    .forEach((item) => {
      item.deps.forEach((dep) => (dep.version = baseModule[dep.moduleName]))
    })

  for (let item of pkgs) {
    await npmPublish({
      moduleName: item.pkg.name,
      version: item.upgradeVersion.trim(),
      deps: item.deps
    })
  }

  const gitTagVersion = await question(`Please specify git tag version`)

  // 检查当前的git状态
  const { stdout } = await $`git status - s`
  if (!stdout) {
    return
  }

  // git commit
  await $`git add. && git commit - m "release ${gitTagVersion}"`.pipe(
    process.stderr
  )
  // git push
  await $`git push origin master`.pipe(process.stderr)
  // create git tag
  await $`git tag ${gitTagVersion} `.pipe(process.stderr)
  // push tag
  await $`git push origin ${gitTagVersion} `.pipe(process.stderr)
}

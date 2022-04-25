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

interface IPackageJSON {
  name: string
  version: string
  dependencies: { [key: string]: string }
}

export default async function npmRelease(pkgs: Array<string>) {
  const list = pkgs.map((pkg) =>
    require(`${pkg}/package.json`)
  ) as Array<IPackageJSON>

  for (let v of list) {
    const newVersion = await question(
      [
        `Release module => ${v.name}`,
        `current version => ${v.version}`,
        `Press [Enter] skip Release\n`
      ].join('\n')
    )
    v.version = newVersion.trim()
  }

  // check version
  if (list.every((item) => !item.version)) {
    console.log(`skip all module release`)
    return
  }

  list
    .filter((v) => v.version)
    .forEach((v) => {
      // update deps
      upgradeDep(v.name, v.version, list)
      // publish module
      npmPublish(v)
    })

  // push git tag
  pushGitTag()
}

function upgradeDep(name: string, version: string, pkgs: Array<IPackageJSON>) {
  for (let pkg of pkgs) {
    if (name != pkg.name && pkg.dependencies[name]) {
      pkg.dependencies[name] = `^${version}`
    }
  }
}

export async function npmPublish(pkg: IPackageJSON) {
  const { name } = pkg
  const pkgDir = `./packages/${name}`

  // update package.json
  console.log(`write => ${pkgDir}/package.json`)
  await fs.writeFile(join(pkgDir, 'package.json'), JSON.stringify(pkg, null, 2))

  // publish module
  const { stdout, stderr } = await $`cd ${pkgDir} && npm publish`
  console.log(stdout, stderr)
}

export async function pushGitTag() {
  const gitTagVersion = await question(`Please specify git tag version`)
  // git commit
  await $`git add. && git commit - m "release ${gitTagVersion}"`.pipe(
    process.stdout
  )
  // git push
  await $`git push origin master`.pipe(process.stdout)
  // create git tag
  await $`git tag ${gitTagVersion} `.pipe(process.stdout)
  // push tag
  await $`git push origin ${gitTagVersion} `.pipe(process.stdout)
}

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
import {spawn} from 'child_process';
import {pathExists} from 'fs-extra';
import {join} from 'path';
import {IDubboExtInfo, IExtraResult} from '../typings';

const startFlag = 'Output at:';

/**
 * 根据配置信息从jar class文件中提取ast信息
 *
 * @param {IDubboExtInfo} extraParam
 * @returns {Promise<{err: Error; res: IExtraResult}>}
 */
export async function extra(extraParam: IDubboExtInfo): Promise<IExtraResult> {
  await checkConfigPath([extraParam.entryJarPath, extraParam.libDirPath]);
  return new Promise<IExtraResult>(async (resolve, reject) => {
    let execCmd = spawn(`java`, [
      '-jar',
      require.resolve('jexpose/jexpose-1.3.jar'),
      extraParam.entry,
      extraParam.entryJarPath,
      extraParam.libDirPath,
      extraParam.providerSuffix || 'Provider',
    ]);

    let err: string = '';
    let jarDir: string = '';
    execCmd.stdout.setEncoding('utf8');
    execCmd.stderr.setEncoding('utf8');
    execCmd.stdout.on('data', (rowData: Buffer) => {
      let output = rowData.toString('utf8');
      if (output.includes(startFlag)) {
        jarDir = output.match(/Output at :(.*)(\nelapsed.*?s)?/)[1];
      }
    });

    execCmd.stderr.on('data', (rowData: Buffer) => {
      err += rowData.toString('utf8');
    });

    execCmd.on('close', code => {
      if (jarDir) {
        resolve({
          jarInfo: join(jarDir, '/output/deflated.json'),
          jarDir,
        });
      }
      if (err) {
        console.error(`exitCode:${code}  errorInfo:${err}`);
      } else if (!jarDir) {
        reject(new Error('解析失败未获取输出文件路径'));
      } else {
      }
    });
  });
}

/**
 *  验证文件路径是否存在
 *
 * @param fileOrDirPath
 */
async function checkConfigPath(fileOrDirPath: string[]): Promise<boolean> {
  let isOk = true;
  for (const fileItempath of fileOrDirPath) {
    let isExist = await isPathExist(fileItempath);
    if (!isExist) {
      isOk = false;
      console.warn(`文件路径配置不正确:${fileItempath}`);
    }
  }

  return isOk;
}
/**
 * 验证文件或文件夹
 * @param fileOrDirPath
 */
async function isPathExist(fileOrDirPath: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    pathExists(fileOrDirPath, (err, exists) => {
      if (err) {
        return resolve(false);
      }
      resolve(exists);
    });
  });
}

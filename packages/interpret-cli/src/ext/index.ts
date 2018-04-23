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
import {join} from 'path';
import {spawn} from 'child_process';
import {IDubboExtInfo, IExtraResult} from '../typings';

const startFlag = 'Output at:';

/**
 * 根据配置信息从jar class文件中提取ast信息
 *
 * @param {IDubboExtInfo} extraParam
 * @returns {Promise<{err: Error; res: IExtraResult}>}
 */
export async function extra(extraParam: IDubboExtInfo): Promise<IExtraResult> {
  return new Promise<IExtraResult>((resolve, reject) => {
    let execCmd = spawn(`java`, [
      '-jar',
      join(__dirname, '../../ext/jexpose-1.0.jar'),
      extraParam.entry,
      extraParam.entryJarPath,
      extraParam.libDirPath,
    ]);

    let err: string = '';
    let jarDir: string = '';
    execCmd.stdout.on('data', rowData => {
      let output = rowData.toString();
      console.log(output);
      if (output.includes(startFlag)) {
        let beginIndex = output.indexOf(startFlag) + startFlag.length;
        jarDir = output.substring(beginIndex).trim();
      }
    });

    execCmd.stderr.on('data', rowData => {
      err += rowData.toString();
      console.log(err);
    });

    execCmd.on('close', code => {
      if (err) {
        reject(new Error(`exitCode:${code}  errorInfo:${err}`));
      } else if (!jarDir) {
        reject(new Error('解析失败未获取输出文件路径'));
      } else {
        resolve({
          jarInfo: join(jarDir, '/output/deflated.json'),
          jarDir,
        });
      }
    });
  });
}

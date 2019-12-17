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
import {readJson} from 'fs-extra';
import {isAbsolute, join} from 'path';
import {to} from './to';
import {IConfig} from './typings';

export default class Config {
  static fromConfigPath(
    configPath: string,
  ): Promise<{err: Error; res: IConfig}> {
    return to<IConfig>(
      readJson(configPath).then(config => {
        // Relative path to absolute path
        config.output = Config.getAbsolutePath(config.output);
        config.entryJarPath = Config.getAbsolutePath(config.entryJarPath);
        config.libDirPath = Config.getAbsolutePath(config.libDirPath);
        return config;
      }),
    );
  }

  static getAbsolutePath(filePath: string) {
    if (filePath && !isAbsolute(filePath)) {
      return join(process.cwd(), filePath);
    } else {
      return filePath;
    }
  }
}

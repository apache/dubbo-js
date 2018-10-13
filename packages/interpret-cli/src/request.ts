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
import debug from 'debug';
import {readJson} from 'fs-extra';
import {IntepretHandle} from './handle';
import {IConfig, IJarInfo, IJClass, TypeInfoI} from './typings';

const log = debug('j2t:core:application');

/**
 *
 *Translation request for provider
 *
 *
 */
export class Request {
  constructor(config: IConfig) {
    log('Request init');
    this.config = config;
  }

  private config: IConfig;

  private interpretedFiles: string[] = [];

  private jarInfo: IJarInfo;

  private typeInfo: Map<string, TypeInfoI> = new Map();

  public isRecorded(fileAbsPath) {
    return this.interpretedFiles.includes(fileAbsPath);
  }

  public record(fileAbsPath) {
    this.interpretedFiles.push(fileAbsPath);
  }

  public async work() {
    log('read jar config', this.config.jarInfo);
    this.jarInfo = await readJson(this.config.jarInfo);
    await this.interpret();
  }

  public async interpret() {
    if (this.jarInfo.providers.length === 0) {
      console.error(
        `未匹配到接口,请验证java接口文件是否以${this.config.entry}开头,以${
          this.providerSuffix
        }结尾`,
      );
    }
    for (let providerPath of this.jarInfo.providers) {
      log('start transaction for provider::', providerPath);
      await new IntepretHandle(providerPath, this).work();
    }
  }

  public getAst(classPath: string): IJClass {
    if (this.jarInfo.classes[classPath]) {
      return this.jarInfo.classes[classPath];
    } else {
      throw new Error("Can't find class ast" + classPath);
    }
  }

  public hasAst(classPath: string): boolean {
    return !!this.jarInfo.classes[classPath];
  }

  get outputDir() {
    return this.config.output;
  }

  get providerSuffix(): string {
    return this.config.providerSuffix || 'Provider';
  }

  registerTypeInfo(typeInfoItem: TypeInfoI) {
    let key = '';
    if (typeInfoItem.classPath) {
      key = typeInfoItem.classPath;
    }

    if (this.typeInfo.has(key)) {
      log('update class typeInfo:%o', typeInfoItem);
      this.typeInfo.set(key, {
        ...this.typeInfo.get(key),
        ...typeInfoItem,
      });
    } else {
      log('register one class typeInfo:%o', typeInfoItem);
      this.typeInfo.set(key, typeInfoItem);
    }
  }

  getTypeInfo(classPath): TypeInfoI {
    return this.typeInfo.get(classPath);
  }
}

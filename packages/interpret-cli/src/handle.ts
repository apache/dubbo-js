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
import {join, parse} from 'path';
import {Request} from './request';
import {ensureDir} from 'fs-extra';
import {IToImportParam, toImport} from './transfer/to-import';
import {toTypescript} from './transfer/to-typescript';
import {default as Ast, SourceFile} from 'ts-simple-ast';
import {IGetTypeInfo, IJClass, ITypeSearch} from './typings';

const log = debug('j2t:core:inteprethandle');
const ast = new Ast();

/**
 * Translations for individual files
 */
export class IntepretHandle implements ITypeSearch {
  constructor(classPath: string, interpreterRequest: Request) {
    this.classPath = classPath;
    this.request = interpreterRequest;
    log(
      'Start translating :%s, outputDir:%s',
      classPath,
      interpreterRequest.outputDir,
    );
  }

  public classPath: string;

  public request: Request;

  public sourceFile: SourceFile;

  private dependencies: string[] = [];

  get to(): string {
    return join(
      this.request.outputDir,
      this.classPath.split('.').join('/') + '.ts',
    );
  }

  get astJava(): IJClass {
    return this.request.getAst(this.classPath);
  }

  public async work() {
    await this.prepare();
    await this.doItRecursively();
  }

  /**
   *
   * @returns {Promise<void>}
   */
  private async prepare() {
    ast.addSourceFileFromText(this.to, '');
    this.sourceFile = ast.getSourceFile(this.to);
    await ensureDir(parse(this.to).dir);
  }

  public hasAst = classPath => {
    return this.request.hasAst(classPath);
  };

  public getTypeInfo: IGetTypeInfo = classPath => {
    return this.request.getTypeInfo(classPath);
  };

  public isTypeParam = typeName => {
    for (let typeParamItem of this.astJava.typeParams) {
      if (typeParamItem.name === typeName) {
        return true;
      }
    }
    return false;
  };

  /**
   * Adding dependencies
   *
   * @param classPath
   * @param className
   * @returns {Promise<void>}
   */
  public async addDenpend(classPath: string) {
    if (!(await this.request.hasAst(classPath))) {
      log(`No class ast found:${classPath}`);
      return;
    }

    if(classPath=== this.classPath) {
      log(`ignore self reference:${this.classPath}`);
      return;
    }

    log(`Adding dependencies ${this.classPath}`);

    if (!this.dependencies.includes(classPath)) {
      this.dependencies.push(classPath);

      if (!this.request.isRecorded(classPath)) {
        this.request.record(classPath);
        try {
          await new IntepretHandle(classPath, this.request).work();
        } catch (err) {
          console.error('Error in translating file::', classPath, err.stack);
          throw err;
        }
      }

      try {
        this.sourceFile.addImport(
          toImport(
            Object.assign({}, this.getTypeInfo(classPath) as IToImportParam, {
              packagePath: this.getTypeInfo(this.classPath).packagePath,
            }),
          ),
        );
      } catch (err) {
        console.error(
          `Error in adding dependencies :add ${classPath} in ${
            this.classPath
          },error:${err}`,
        );
      }
    }
  }

  /**
   *
   * @returns {Promise<void>}
   */
  private async doItRecursively() {
    await toTypescript(this);
    await ast.saveUnsavedSourceFiles();
  }
}

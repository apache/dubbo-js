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
import {ensureDir} from 'fs-extra';
import {join, parse} from 'path';
import {default as Ast, SourceFile} from 'ts-simple-ast';
import {Request} from './request';
import {toImport} from './transfer/to-import';
import {toTypescript} from './transfer/to-typescript';
import {IDependItem, IGetTypeInfo, IJClass, ITypeSearch} from './typings';

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

  private dependencies: IDependItem[] = [];

  get to(): string {
    return join(
      this.request.outputDir,
      this.classPath.split('.').join('/') + '.ts',
    );
  }

  get astJava(): IJClass {
    return this.request.getAst(this.classPath);
  }

  get providerSuffix(): string {
    return this.request.providerSuffix;
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
    ast.addSourceFileFromText(this.to, '//generate by dubbo-js');
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
  public async addDenpend(classPath: string): Promise<IDependItem> {
    if (!(await this.request.hasAst(classPath))) {
      log(`No class ast found:${classPath}`);
      return;
    }

    if (classPath === this.classPath) {
      log(`ignore self reference:${this.classPath}`);
      let className = this.getTypeInfo(classPath).className;
      return {
        classPath,
        name: className,
        importName: className,
      };
    }

    log(`Adding dependencies ${this.classPath}`);

    let dependItem = this.getDependItem(classPath);

    if (!dependItem) {
      if (!this.request.isRecorded(classPath)) {
        this.request.record(classPath);
        try {
          await new IntepretHandle(classPath, this.request).work();
        } catch (err) {
          console.error('Error in translating file::', classPath, err.stack);
          throw err;
        }
      }

      dependItem = this.createDependItem(classPath);
      this.dependencies.push(dependItem);
      try {
        this.sourceFile.addImport(
          toImport({
            className:
              dependItem.name != dependItem.importName
                ? `${dependItem.name} as ${dependItem.importName}`
                : dependItem.name,
            classPath,
            packagePath: this.getTypeInfo(this.classPath).packagePath,
          }),
        );
      } catch (err) {
        console.error(
          `Error in adding dependencies :add ${classPath} in ${this.classPath}`,
        );
        console.error(err);
      }
      return dependItem;
    } else {
      return dependItem;
    }
  }

  private getDependItem(classPath: string): IDependItem | null {
    for (let dependItem of this.dependencies) {
      if (dependItem.classPath === classPath) {
        return dependItem;
      }
    }
    return null;
  }

  private createDependItem(classPath: string): IDependItem {
    let name = this.getTypeInfo(classPath).className;
    let importName = name;
    let index = 0;
    while (this.isDependNameExist(importName)) {
      importName += index;
    }

    return {
      classPath,
      name,
      importName: importName,
    };
  }

  private isDependNameExist(importName) {
    let isExist = false;
    for (let dependItem of this.dependencies) {
      if (dependItem.importName === importName) {
        isExist = true;
      }
    }

    return isExist;
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

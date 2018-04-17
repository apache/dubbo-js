import debug from "debug";
import {readJson} from "fs-extra";
import {IntepretHandle} from "./handle";
import {IConfig, IJarInfo, IJClass, TypeInfoI} from "./typings";

const log = debug('j2t:core:application');

/**
 *
 *Translation request for provider
 *
 *
 */
export class Request {

  constructor(config: IConfig) {
    log("Request init");
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
    log("read jar config", this.config.jarInfo);
    this.jarInfo = await readJson(this.config.jarInfo);
    await this.interpret();
  }

  public async interpret() {
    for (let providerPath of  this.jarInfo.providers) {
      log("start transaction for provider::", providerPath);
      await new IntepretHandle(
        providerPath,
        this
      ).work();
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

  registerTypeInfo(typeInfoItem: TypeInfoI) {
    let key = "";
    if (typeInfoItem.classPath) {
      key = typeInfoItem.classPath;
    }

    if (this.typeInfo.has(key)) {
      log("update class typeInfo:%o", typeInfoItem);
      this.typeInfo.set(key, {
        ...this.typeInfo.get(key),
        ...typeInfoItem
      });
    } else {
      log("register one class typeInfo:%o", typeInfoItem);
      this.typeInfo.set(key, typeInfoItem);
    }
  }

  getTypeInfo(classPath): TypeInfoI {
    return this.typeInfo.get(classPath);
  }
}

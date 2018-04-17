import {to} from "./to";
import {readJson} from "fs-extra";
import {isAbsolute, join} from "path";
import {IConfig} from "./typings";


export default class Config {

  static fromConfigPath(configPath: string): Promise<{ err: Error; res: IConfig }> {
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

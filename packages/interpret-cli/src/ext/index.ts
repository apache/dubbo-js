import {join} from "path";
import {spawn} from "child_process";
import {IDubboExtInfo, IExtraResult} from "../typings";

const startFlag = "Output at: ";

/**
 * 根据配置信息从jar class文件中提取ast信息
 *
 * @param {IDubboExtInfo} extraParam
 * @returns {Promise<{err: Error; res: IExtraResult}>}
 */
export async function extra(extraParam: IDubboExtInfo): Promise<IExtraResult> {
  return new Promise<IExtraResult>((resolve, reject) => {
    let execCmd = spawn(`java`, [
      "-jar",
      join(__dirname, "../../ext/jexpose-1.0.jar"),
      extraParam.entry,
      extraParam.entryJarPath,
      extraParam.libDirPath,
      extraParam.jrtPath
    ]);

    let err: string = "";
    let jarDir: string = "";
    execCmd.stdout.on("data", rowData => {
      let output = rowData.toString();
      console.log(output);
      if (output.includes(startFlag)) {
        let beginIndex = output.indexOf(startFlag) + startFlag.length;
        let endIndex = output.indexOf("\n", beginIndex);
        jarDir = output.substring(beginIndex, endIndex);
      }
    });

    execCmd.stderr.on("data", rowData => {
      err += rowData.toString();
      console.log(err);
    });

    execCmd.on("close", code => {
      if (err) {
        reject(new Error(`exitCode:${code}  errorInfo:${err}`));
      } else if (!jarDir) {
        reject(new Error("解析失败未获取输出文件路径"));
      } else {
        resolve({
          jarInfo: join(jarDir, "/output/deflated.json"),
          jarDir
        });
      }
    });
  });
}

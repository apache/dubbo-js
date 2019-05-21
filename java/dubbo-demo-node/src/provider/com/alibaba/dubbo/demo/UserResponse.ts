import java from 'js-to-java';

export interface IUserResponse {
  status?: string;
  info?: {[name: string]: string};
}

export class UserResponse {
  constructor(params: IUserResponse) {
    this.status = params.status;
    this.info = params.info;
  }

  status?: string;
  info?: {[name: string]: string};

  __fields2java() {
    let infoMapTransfer = new Map();
    for (let mapKey in this.info) {
      infoMapTransfer.set(java.String(mapKey), java.String(this.info[mapKey]));
    }
    return {
      $class: 'com.alibaba.dubbo.demo.UserResponse',
      $: {status: java.String(this.status), info: java.Map(infoMapTransfer)},
    };
  }
}

//generate by interpret-cli dubbo2.js

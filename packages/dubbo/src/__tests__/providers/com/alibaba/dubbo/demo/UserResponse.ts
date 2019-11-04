import {GenerticTypeResponse} from './GenerticTypeResponse';
import java from 'js-to-java';

//generate by interpret-cli dubbo2.js

export interface IUserResponse {
  some?: {[name: string]: string};
  list?: GenerticTypeResponse<number>;
  status?: string;
  info?: {[name: string]: string};
}

export class UserResponse {
  some?: {[name: string]: string};
  list?: GenerticTypeResponse<number>;
  status?: string;
  info?: {[name: string]: string};

  constructor(params: IUserResponse) {
    this.some = params.some;
    this.list = params.list;
    this.status = params.status;
    this.info = params.info;
  }

  __fields2java() {
    let someMapTransfer = new Map();
    for (let mapKey in this.some) {
      someMapTransfer.set(java.String(mapKey), java.String(this.some[mapKey]));
    }
    let infoMapTransfer = new Map();
    for (let mapKey in this.info) {
      infoMapTransfer.set(java.String(mapKey), java.String(this.info[mapKey]));
    }
    return {
      $class: 'com.alibaba.dubbo.demo.UserResponse',
      $: {
        some: java.HashMap(someMapTransfer),
        list: this.list ? this.list.__fields2java() : null,
        status: java.String(this.status),
        info: java.Map(infoMapTransfer),
      },
    };
  }
}

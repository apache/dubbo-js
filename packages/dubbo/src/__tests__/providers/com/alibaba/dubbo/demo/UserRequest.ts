import * as java from 'js-to-java';
import {argumentMap} from 'interpret-util';

export interface IUserRequest {
  name?: string;
  id?: number;
  email?: string;
}

export class UserRequest {
  constructor(params: IUserRequest) {
    this.name = params.name;
    this.id = params.id;
    this.email = params.email;
  }

  name?: string;
  id?: number;
  email?: string;

  __fields2java() {
    return {
      $class: 'com.alibaba.dubbo.demo.UserRequest',
      $: {
        name: java.String(this.name),
        id: java.Integer(this.id),
        email: java.String(this.email),
      },
    };
  }
}

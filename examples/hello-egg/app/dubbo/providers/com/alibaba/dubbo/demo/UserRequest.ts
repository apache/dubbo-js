import {Sex} from './Sex';
import java from 'js-to-java';

export interface IUserRequest {
  sex?: Sex;
  name?: string;
  id?: number;
  email?: string;
}

export class UserRequest {
  constructor(params: IUserRequest) {
    this.sex = params.sex;
    this.name = params.name;
    this.id = params.id;
    this.email = params.email;
  }

  sex?: Sex;
  name?: string;
  id?: number;
  email?: string;

  __fields2java() {
    return {
      $class: 'com.alibaba.dubbo.demo.UserRequest',
      $: {
        sex: java['enum']('com.alibaba.dubbo.demo.Sex', Sex[this.sex]),
        name: java.String(this.name),
        id: java.Integer(this.id),
        email: java.String(this.email),
      },
    };
  }
}

//generate by interpret-cli dubbo2.js

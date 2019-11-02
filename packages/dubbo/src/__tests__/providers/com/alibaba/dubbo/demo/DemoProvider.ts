import {UserRequest} from './UserRequest';
import {UserResponse} from './UserResponse';
import {argumentMap, JavaString} from 'interpret-util';
import {TDubboCallResult, Dubbo} from 'dubbo2.js';

//generate by interpret-cli dubbo2.js

export interface IDemoProvider {
  sayHello(String0: JavaString): TDubboCallResult<string>;
  test(): TDubboCallResult<void>;
  echo(): TDubboCallResult<string>;
  getUserInfo(UserRequest0: UserRequest): TDubboCallResult<UserResponse>;
}

export const DemoProviderWrapper = {
  sayHello: argumentMap,
  test: argumentMap,
  echo: argumentMap,
  getUserInfo: argumentMap,
};

export function DemoProvider(dubbo: Dubbo): IDemoProvider {
  return dubbo.proxyService<IDemoProvider>({
    dubboInterface: 'com.alibaba.dubbo.demo.DemoProvider',
    methods: DemoProviderWrapper,
  });
}

import {Dubbo, TDubboCallResult} from 'dubbo-js';
import {argumentMap, JavaString} from 'interpret-util';
import {UserRequest} from './UserRequest';
import {UserResponse} from './UserResponse';

export interface IDemoProvider {
  sayHello(name: JavaString): TDubboCallResult<string>;
  test(): TDubboCallResult<void>;
  echo(): TDubboCallResult<string>;
  getUserInfo(request: UserRequest): TDubboCallResult<UserResponse>;
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

//generate by interpret-cli dubbo2.js

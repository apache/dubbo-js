import {Dubbo, java, TDubboCallResult} from 'dubbo-js';

//=====================types===========================
export interface IUserResponse {
  status?: string;
  info?: {[name: string]: string};
}

export interface IDemoProvider {
  sayHello(name: string): TDubboCallResult<string>;
  test(): TDubboCallResult<void>;
  echo(): TDubboCallResult<string>;
  getUserInfo(): TDubboCallResult<IUserResponse>;
}

export interface ITypeRequest {
  bigDecimal?: {value: string};
  map?: {[name: string]: string};
}

export interface IBasicTypeProvider {
  testBasicType(): TDubboCallResult<ITypeRequest>;
}

export interface IErrorProvider {
  errorTest(): TDubboCallResult<void>;
}

//========================provider=======================
export const demoProvider = (dubbo: Dubbo): IDemoProvider =>
  dubbo.proxyService({
    dubboInterface: 'com.alibaba.dubbo.demo.DemoProvider',
    methods: {
      sayHello(name: string) {
        return [java.String(name)];
      },

      echo() {},

      test() {},

      getUserInfo() {
        return [
          java.combine('com.alibaba.dubbo.demo.UserRequest', {
            id: 1,
            name: 'nodejs',
            email: 'node@qianmi.com',
          }),
        ];
      },
    },
  });

export const basicTypeProvider = (dubbo: Dubbo): IBasicTypeProvider =>
  dubbo.proxyService({
    dubboInterface: 'com.alibaba.dubbo.demo.BasicTypeProvider',
    methods: {
      testBasicType() {
        return [
          java.combine('com.alibaba.dubbo.demo.TypeRequest', {
            map: java.Map({name: 'test'}),
            bigDecimal: java.BigDecimal('1000.0000'),
          }),
        ];
      },
    },
  });

export const errorProvider = (dubbo: Dubbo): IErrorProvider =>
  dubbo.proxyService({
    dubboInterface: 'com.alibaba.dubbo.demo.ErrorProvider',
    methods: {
      errorTest() {
        return [];
      },
    },
  });

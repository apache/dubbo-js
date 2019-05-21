import {argumentMap} from 'interpret-util';
import {TDubboCallResult, Dubbo} from 'dubbo2.js';

export interface IErrorProvider {
  errorTest(): TDubboCallResult<void>;
}

export const ErrorProviderWrapper = {errorTest: argumentMap};

export function ErrorProvider(dubbo: Dubbo): IErrorProvider {
  return dubbo.proxyService<IErrorProvider>({
    dubboInterface: 'com.alibaba.dubbo.demo.ErrorProvider',
    methods: ErrorProviderWrapper,
  });
}

//generate by interpret-cli dubbo2.js

import {TDubboCallResult, Dubbo} from 'dubbo2.js';
import {argumentMap} from 'interpret-util';

export interface IErrorProvider {
  errorTest(): TDubboCallResult<void>;
}

export const ErrorProviderWrapper = {errorTest: argumentMap};

export function ErrorProvider(dubbo: Dubbo): IErrorProvider {
  return dubbo.proxyService<IErrorProvider>({
    dubboInterface: 'com.alibaba.dubbo.demo.ErrorProvider',
    version: '2.0.0',

    methods: ErrorProviderWrapper,
  });
}

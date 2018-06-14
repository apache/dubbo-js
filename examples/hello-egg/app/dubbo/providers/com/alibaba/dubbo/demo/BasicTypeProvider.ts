import {Dubbo, TDubboCallResult} from 'dubbo2.js';
import {argumentMap} from 'interpret-util';
import {TypeRequest} from './TypeRequest';

export interface IBasicTypeProvider {
  testBasicType(request: TypeRequest): TDubboCallResult<TypeRequest>;
}

export const BasicTypeProviderWrapper = {testBasicType: argumentMap};

export function BasicTypeProvider(dubbo: Dubbo): IBasicTypeProvider {
  return dubbo.proxyService<IBasicTypeProvider>({
    dubboInterface: 'com.alibaba.dubbo.demo.BasicTypeProvider',
    methods: BasicTypeProviderWrapper,
  });
}

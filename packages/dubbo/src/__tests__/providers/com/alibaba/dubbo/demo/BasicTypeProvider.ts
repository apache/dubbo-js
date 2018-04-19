import {TypeRequest} from './TypeRequest';
import {TDubboCallResult, Dubbo} from 'dubbo2.js';
import {argumentMap} from 'interpret-util';

export interface IBasicTypeProvider {
  testBasicType(TypeRequest0: TypeRequest): TDubboCallResult<TypeRequest>;
}

export const BasicTypeProviderWrapper = {testBasicType: argumentMap};

export function BasicTypeProvider(dubbo: Dubbo): IBasicTypeProvider {
  return dubbo.proxyService<IBasicTypeProvider>({
    dubboInterface: 'com.alibaba.dubbo.demo.BasicTypeProvider',
    methods: BasicTypeProviderWrapper,
    version:"2.0.0"
  });
}

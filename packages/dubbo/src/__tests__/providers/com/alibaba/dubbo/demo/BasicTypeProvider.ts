import {TypeRequest} from './TypeRequest';
import {argumentMap} from 'interpret-util';
import {TDubboCallResult, Dubbo} from 'dubbo2.js';

//generate by interpret-cli dubbo2.js

export interface IBasicTypeProvider {
  testBasicType(TypeRequest0: TypeRequest): TDubboCallResult<TypeRequest>;
}

export const BasicTypeProviderWrapper = {testBasicType: argumentMap};

export function BasicTypeProvider(dubbo: Dubbo): IBasicTypeProvider {
  return dubbo.proxyService<IBasicTypeProvider>({
    dubboInterface: 'com.alibaba.dubbo.demo.BasicTypeProvider',
    methods: BasicTypeProviderWrapper,
  });
}

/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
    dubboInterface: 'org.apache.dubbo.demo.DemoProvider',
    methods: {
      sayHello(name: string) {
        return [java.String(name)];
      },

      echo() {},

      test() {},

      getUserInfo() {
        return [
          java.combine('org.apache.dubbo.demo.UserRequest', {
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
    dubboInterface: 'org.apache.dubbo.demo.BasicTypeProvider',
    methods: {
      testBasicType() {
        return [
          java.combine('org.apache.dubbo.demo.TypeRequest', {
            map: java.Map({name: 'test'}),
            bigDecimal: java.BigDecimal('1000.0000'),
          }),
        ];
      },
    },
  });

export const errorProvider = (dubbo: Dubbo): IErrorProvider =>
  dubbo.proxyService({
    dubboInterface: 'org.apache.dubbo.demo.ErrorProvider',
    methods: {
      errorTest() {
        return [];
      },
    },
  });

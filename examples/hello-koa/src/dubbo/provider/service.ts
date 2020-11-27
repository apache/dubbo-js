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
import ip from 'ip';
import java from 'js-to-java';
import {IDubboService} from 'apache-dubbo-js';

enum Sex {
  male,
  female,
}

interface IUserRequest {
  id: number;
  name: string;
  email: string;
  sex: Sex;
}

class UserResponse {
  status: string;
  info: Map<string, string>;

  __fields2java() {
    return java('org.apache.dubbo.demo.UserResponse', {
      status: java.String(this.status),
      info: this.info,
    });
  }
}

class TypeRequest {
  map: Map<string, string>;
  bigDecimal: {value: string};

  __fields2java() {
    return java('org.apache.dubbo.demo.TypeRequest', {
      map: this.map,
      bigDecimal: java.BigDecimal(this.bigDecimal.value),
    });
  }
}

//========================provider=======================

class DemoProvider implements IDubboService {
  dubboInterface = 'org.apache.dubbo.demo.DemoProvider';
  version = '1.0.0';
  methods = {
    sayHello(name: string) {
      return java.String(
        `Hello ${name}, response from provider ${ip.address()}`,
      );
    },

    echo() {
      return 'pang';
    },

    test() {
      console.log('test');
    },

    getUserInfo(request: IUserRequest) {
      console.log(request);
      const res = new UserResponse();
      res.status = 'ok';
      const map = new Map();
      map.set('id', '1');
      map.set('name', 'test');
      res.info = map;
      return res;
    },
  };
}

const basicTypeProvider = {
  dubboInterface: 'org.apache.dubbo.demo.BasicTypeProvider',
  version: '2.0.0',
  methods: {
    testBasicType(req: TypeRequest) {
      const response = new TypeRequest();
      response.bigDecimal = {value: '100.00'};
      const map = new Map();
      map.set('hello', 'world');
      response.map = map;
      return response;
    },
  },
} as IDubboService;

class ErrorProvider implements IDubboService {
  dubboInterface = 'org.apache.dubbo.demo.ErrorProvider';
  version = '1.0.0';

  methods = {
    errorTest() {
      throw new Error('ErrorProvider error');
    },
  };
}

export default [new DemoProvider(), basicTypeProvider, new ErrorProvider()];

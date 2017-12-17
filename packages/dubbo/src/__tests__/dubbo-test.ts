import {Dubbo} from '../dubbo';
import * as java from 'js-to-java';
import {TDubboCallResult} from '../types';

interface IDemoService {
  sayHello(name: string): TDubboCallResult<string>;

  echo(): TDubboCallResult<string>;

  test(): TDubboCallResult<void>;

  getUserInfo(): TDubboCallResult<{
    status: string;
    info: {id: number; name: string};
  }>;
}

const dubbo = new Dubbo({
  application: {name: '@qianmi/node-dubbo'},
  register: 'localhost:2181',
  dubboVersion: '2.0.0',
  interfaces: ['com.alibaba.dubbo.demo.DemoService'],
});

const demoService = dubbo.proxyService<IDemoService>({
  dubboInterface: 'com.alibaba.dubbo.demo.DemoService',
  version: '0.0.0',
  methods: {
    sayHello(name) {
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

it('test sayHello', async () => {
  const {res, err} = await demoService.sayHello('node');
  expect(err).toEqual(null);
  expect(res.includes('Hello node, response form provider')).toEqual(true);
});

it('test echo', async () => {
  const res = await demoService.echo();
  expect(res).toEqual({
    res: 'pang',
    err: null,
  });
});

it('test getUserInfo', async () => {
  const res = await demoService.getUserInfo();
  expect(res).toEqual({
    err: null,
    res: {status: 'ok', info: {id: '1', name: 'test'}},
  });
});

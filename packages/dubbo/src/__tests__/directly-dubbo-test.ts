import DirectlyDubbo from '../directly-dubbo';
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

const dubbo = DirectlyDubbo.from({
  dubboAddress: 'localhost:20880',
  dubboVersion: '2.0.0',
  dubboInvokeTimeout: 10,
});

const demoService = dubbo.proxyService<IDemoService>({
  dubboInterface: 'com.alibaba.dubbo.demo.DemoService',
  version: '1.0.0',
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

describe('demoService', () => {
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
});

import java from 'js-to-java';
import log4js from 'log4js';
import {Dubbo} from '../dubbo';
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
  dubboInvokeTimeout: 0.001,
  interfaces: ['com.alibaba.dubbo.demo.DemoService'],
});

//use middleware
dubbo.use(async function test(ctx, next) {
  const startTime = Date.now();
  await next();
  const endTime = Date.now();
  const {request: {dubboInterface, methodName}} = ctx;
  console.log(
    `timeout: invoke ${dubboInterface}#${methodName} costTime: ${endTime -
      startTime}`,
  );
});

const demoService = dubbo.proxyService<IDemoService>({
  dubboInterface: 'com.alibaba.dubbo.demo.DemoService',
  version: '1.0.0',
  methods: {
    sayHello(name) {
      return [java.String(name)];
    },

    echo() {},

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

describe('dubbo timeout test suite', () => {
  it('test echo timeout', async () => {
    const {res, err} = await demoService.echo();
    expect(res).toEqual(null);
    expect(err != null).toEqual(true);
    expect(err.message).toMatch(/remote invoke timeout/);
  });

  it('test sayHello', async () => {
    const {res, err} = await demoService.sayHello('node');
    expect(res).toEqual(null);
    expect(err != null).toEqual(true);
    expect(err.message).toMatch(/remote invoke timeout/);
  });

  it('test getUserInfo', async () => {
    const {res, err} = await demoService.getUserInfo();
    expect(res).toEqual(null);
    expect(err != null).toEqual(true);
    expect(err.message).toMatch(/remote invoke timeout/);
  });
});

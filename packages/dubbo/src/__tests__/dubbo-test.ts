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

interface IBasicTypeService {
  testBasicType(
    typeRequest: Map<string, string>,
  ): TDubboCallResult<{
    hello: string;
    email: string;
  }>;
}

interface IErrorService {
  errorTest();
}

const dubbo = new Dubbo({
  application: {name: '@qianmi/node-dubbo'},
  register: 'localhost:2181',
  dubboVersion: '2.0.0',
  interfaces: [
    'com.alibaba.dubbo.demo.DemoService',
    'com.alibaba.dubbo.demo.BasicTypeService',
    'com.alibaba.dubbo.demo.ErrorService',
  ],
});

//use middleware
dubbo.use(async function test(ctx, next) {
  const startTime = Date.now();
  await next();
  const endTime = Date.now();
  const {request: {dubboInterface, methodName}} = ctx;
  console.log(
    `invoke ${dubboInterface}#${methodName} costTime: ${endTime - startTime}`,
  );
});

dubbo.subscribe({
  onReady() {
    console.log('onReady');
  },
  onSysError(err) {
    console.log(err);
  },
  onStatistics(stat) {
    console.log(stat);
  },
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

const basicTypeService = dubbo.proxyService<IBasicTypeService>({
  dubboInterface: 'com.alibaba.dubbo.demo.BasicTypeService',
  version: '2.0.0',
  methods: {
    testBasicType(typeRequest) {
      return [
        java.combine('com.alibaba.dubbo.demo.TypeRequest', {
          map: typeRequest,
          bigDecimal: java.BigDecimal('100.00'),
        }),
      ];
    },
  },
});

describe('typeBasicServer', () => {
  it('testBasicType', async () => {
    const map = new Map();
    map.set('hello', 'hello world');
    map.set('email', 'email@qianmi.com');
    const reuslt = await basicTypeService.testBasicType(map);
    expect(reuslt).toEqual({
      err: null,
      res: {
        bigDecimal: {value: '100.00'},
        map: {
          hello: 'hello world',
          email: 'email@qianmi.com',
        },
      },
    });
  });
});

const errorService = dubbo.proxyService<IErrorService>({
  dubboInterface: 'com.alibaba.dubbo.demo.ErrorService',
  version: '1.0.0',
  methods: {
    errorTest() {
      return [];
    },
  },
});

describe('error test', () => {
  it('test errorTest', async () => {
    const {res, err} = await errorService.errorTest();
    expect(err != null).toEqual(true);
    expect(res == null).toEqual(true);
  });
});

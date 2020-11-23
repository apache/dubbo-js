import java from 'js-to-java';
import {
  DirectlyDubbo,
  DubboServer,
  Dubbo,
  setting,
  TDubboCallResult,
} from '../index';

export interface IDemoProvider {
  sayHello(name: string, rest: number): TDubboCallResult<string>;
  getUserInfo(): TDubboCallResult<{
    id: number;
    name: string;
    lib: string;
  }>;
}

// =========================environment=====================================
// init dubbo server

const sleep = (delay: number) =>
  new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, delay);
  });

let server: DubboServer = null;
beforeAll(async () => {
  server = new DubboServer({
    port: 20880,
    registry: 'localhost:2181',
    services: [
      {
        clazz: 'com.alibaba.dubbo.demo.DemoService',
        version: '1.0.0',
        methods: {
          sayHello(name: string, rest: boolean) {
            return {name, rest};
          },
          async getUserInfo(userInfo: Object) {
            return userInfo;
          },
        },
      },
    ],
  });

  server.use(async (ctx, next) => {
    console.log(`dubbo-server receive requestId:`, ctx.request.requestId);
    await next();
  });
  server.start();

  await sleep(2000);
});

afterAll(async () => {
  // server && server.close();
});

// ======================directly dubbo test suite=======================================

it('test directly dubbo sayHello/getUserInfo', async () => {
  const dubbo = DirectlyDubbo.from({
    dubboAddress: '172.22.226.94:20880',
    dubboVersion: '2.0.2',
    dubboInvokeTimeout: 10,
  });

  const demoService = dubbo.proxyService({
    dubboInterface: 'com.alibaba.dubbo.demo.DemoService',
    version: '1.0.0',
    methods: {
      sayHello(name: string, rest: any) {
        return [java.String(name), java.Boolean(rest)];
      },

      getUserInfo() {
        return [
          java.combine('com.alibaba.dubbo.demo.UserRequest', {
            id: 1,
            name: 'nodejs',
            lib: 'dubbo-js',
          }),
        ];
      },
    },
  });

  // @ts-ignore
  expect(await demoService.sayHello('hello world', 1)).toEqual({
    res: {
      name: 'hello world',
      rest: true,
    },
    err: null,
  });
  // @ts-ignore
  expect(await demoService.getUserInfo()).toEqual({
    res: {
      id: 1,
      name: 'nodejs',
      lib: 'dubbo-js',
    },
    err: null,
  });
});

// ==========================dubbo invoker========================================
it('test dubbo invoke', async () => {
  const dubboSetting = setting.match(['com.alibaba.dubbo.demo.DemoService'], {
    version: '1.0.0',
  });
  const service = {
    demoService: (dubbo: Dubbo): IDemoProvider =>
      dubbo.proxyService({
        dubboInterface: 'com.alibaba.dubbo.demo.DemoService',
        methods: {
          sayHello(name: string, rest: any) {
            return [java.String(name), java.Boolean(rest)];
          },

          getUserInfo() {
            return [
              java.combine('com.alibaba.dubbo.demo.UserRequest', {
                id: 1,
                name: 'nodejs',
                lib: 'dubbo-js',
              }),
            ];
          },
        },
      }),
  };

  const dubbo = new Dubbo<typeof service>({
    application: {name: 'node-test'},
    register: '127.0.0.1:2181',
    dubboSetting,
    service,
  });

  dubbo.use(async (ctx, next) => {
    console.log(`dubbo consumer send request:` + ctx.requestId);
    await next();
  });

  expect(await dubbo.service.demoService.sayHello('hello world', 1)).toEqual({
    err: null,
    res: {
      name: 'hello world',
      rest: true,
    },
  });
  expect(await dubbo.service.demoService.getUserInfo()).toEqual({
    err: null,
    res: {
      id: 1,
      name: 'nodejs',
      lib: 'dubbo-js',
    },
  });
});

// import DubboServer from './server';

import {Dubbo, DubboServer, TDubboCallResult} from '..';
import {Setting} from '../setting';
import ResponseContext from './response-context';

const sleep = (delay: number = 1000) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, delay);
  });
};

(async () => {
  const server = new DubboServer({
    port: 20880,
    registry: 'localhost:2181',
    services: [
      {
        dubboInterface: 'org.apache.dubbo.service.HelloService',
        version: '1.0.0',
        methods: {
          sayHello(ctx: ResponseContext) {
            ctx.attachments = {
              extra: {id: 1},
            };
            return `hello from node`;
          },
        },
      },
    ],
  });

  server.use(async (ctx, next) => {
    console.log(ctx.request.requestId);
    ctx.attachments['before'] = 'ok';
    await next();
    ctx.attachments['after'] = 'ok';
  });

  server.start();
  await sleep();

  const dubboSetting = new Setting().match(
    'org.apache.dubbo.service.HelloService',
    {version: '1.0.0'},
  );

  const service = {
    helloService: (dubbo: Dubbo): {sayHello(): TDubboCallResult<string>} =>
      dubbo.proxyService({
        dubboInterface: 'org.apache.dubbo.service.HelloService',
        methods: {
          sayHello() {
            return [];
          },
        },
      }),
  };

  const dubbo = new Dubbo<typeof service>({
    application: {name: 'node-consumer'},
    registry: 'localhost:2181',
    dubboSetting,
    service,
  });

  dubbo.use(async (ctx, next) => {
    console.log('request.dubboVersion=>', ctx.dubboVersion);
    await next();
    console.log('>>>>providerAttachments>>>>>', ctx.providerAttachments);
  });

  const {res, err} = await dubbo.service.helloService.sayHello();
  console.log(res, err);
})();

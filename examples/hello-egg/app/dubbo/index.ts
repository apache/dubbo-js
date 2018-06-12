import {dubboInvoker, matcher} from 'dubbo-invoker';
import {Context, Dubbo} from 'dubbo2.js';
import {EggApplication} from 'egg';
import service from './service';

declare module 'egg' {
  export interface EggApplication {
    dubbo: Dubbo<typeof service>;
  }
}

export default (app: EggApplication) => {
  const dubbo = new Dubbo<typeof service>({
    application: {name: 'node-egg-bff'},
    register: 'localhost:2181',
    service,
  });

  // extends middleware
  dubbo.use(async (ctx: Context, next: any) => {
    const start = Date.now();
    await next();
    const end = Date.now();
    app.coreLogger.info(
      `${ctx.dubboInterface} was invoked, cost-time ${end - start}`,
    );
  });

  // setting runtime version etc.
  dubbo.use(
    dubboInvoker(
      matcher
        .match('com.alibaba.dubbo.demo.BasicTypeProvider', {
          version: '2.0.0',
        })
        .match('com.alibaba.dubbo.demo.DemoProvider', {version: '1.0.0'})
        .match('com.alibaba.dubbo.demo.ErrorProvider', {version: '1.0.0'}),
    ),
  );

  app.dubbo = dubbo;
};

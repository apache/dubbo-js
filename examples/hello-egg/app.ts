import {EggApplication} from 'egg';
import dubbo from './app/dubbo';

export default async (app: EggApplication) => {
  dubbo(app);
  await app.dubbo.ready();
  app.coreLogger.info('dubbo was ready');
};

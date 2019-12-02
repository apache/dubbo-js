import {Dubbo, setting, zk} from 'dubbo-js';
import * as service from './service';

const dubboSetting = setting
  .match(
    [
      'com.alibaba.dubbo.demo.DemoProvider',
      'com.alibaba.dubbo.demo.ErrorProvider',
    ],
    {
      version: '1.0.0',
    },
  )
  .match('com.alibaba.dubbo.demo.BasicTypeProvider', {version: '2.0.0'});

const dubbo = new Dubbo<typeof service>({
  application: {name: 'dubbo-node-consumer'},
  service,
  dubboSetting,

  register: zk({
    url: 'localhost:2181,localhost:2182,localhost:2183',
  }),
});

dubbo.use(async (ctx, next) => {
  await next();
  console.log('-providerAttachments-->', ctx.providerAttachments);
});

dubbo.subscribe({
  onTrace(msg) {
    console.log(msg);
  },
});

export default dubbo;

// dubbo.ready().then(() => {
//   console.log('dubbo was ready');
// });

// dubbo.subscribe({
//   onTrace: msg => {
//     console.log(msg);
//   },
// });

//cost middleware
/*dubbo.use(async function costTime(ctx, next) {
  console.log('before dubbo cost middleware');
  const startTime = Date.now();
  await next();
  const endTime = Date.now();
  console.log('end makecostTime->', endTime - startTime);
});
*/

// dubbo.use(async function trace(ctx, next) {
//   const uuid = Date.now();
//   ctx.attachments = {
//     uuid,
//   };

//   ctx.attachments = {
//     userId: uuid,
//   };

//   await next();
// });

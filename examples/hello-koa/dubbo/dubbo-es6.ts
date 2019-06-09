import {Dubbo, setting} from 'dubbo2.js';
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

export default new Dubbo<typeof service>({
  application: {name: 'dubbo-node-consumer1'},
  service,
  dubboSetting,

  register: 'localhost:2181,localhost:2182,localhost:2183',
});

//middleware
// dubbo.use(async function costTime(ctx, next) {
//   console.log('before dubbo cost middleware');
//   const startTime = Date.now();
//   await next();
//   const endTime = Date.now();
//   console.log('end makecostTime->', endTime - startTime);
// });

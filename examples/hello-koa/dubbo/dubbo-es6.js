const {Dubbo} = require('dubbo2.js');
const service = require('./service');

delete service['demoProvider'];

const dubbo = (module.exports = new Dubbo({
  application: {name: 'dubbo-node-consumer1'},
  register: 'localhost:2181',
  service,
}));

//middleware
// dubbo.use(async function costTime(ctx, next) {
//   console.log('before dubbo cost middleware');
//   const startTime = Date.now();
//   await next();
//   const endTime = Date.now();
//   console.log('end makecostTime->', endTime - startTime);
// });

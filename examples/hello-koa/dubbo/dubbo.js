const {Dubbo} = require('dubbo2.js');
const service = require('./service');

const dubbo = (module.exports = new Dubbo({
  application: {name: 'dubbo-node-consumer'},
  register: 'localhost:2181',
  service,
}));

//cost middleware
dubbo.use(async function costTime(ctx, next) {
  console.log('before dubbo cost middleware');
  const startTime = Date.now();
  await next();
  const endTime = Date.now();
  console.log('end makecostTime->', endTime - startTime);
});

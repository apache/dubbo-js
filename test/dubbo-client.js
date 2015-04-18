/**
 * Created by bee1314 on 4/17/15.
 */
var DubboClient = require('../index');



//simple
//var client = module.exports = DubboClient('172.19.65.33:2181');


//full
var client2 = module.exports = DubboClient('172.19.65.33:2181', {
  zk: {
    sessionTimeout: 30000,
    spinDelay : 1000,
    retries : 0
  },
  app: {
    'application': 'test-node-dubbo',
    'application.version': '1.0.0'
  }
});



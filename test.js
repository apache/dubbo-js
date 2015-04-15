var DubboClient = require('./index');

//test
DubboClient('172.19.65.33:2181')
  .getProvider('com.ofpay.demo.api.UserProvider')
  .then(function(userProvider) {
    userProvider
    .queryAll()
    .then(function(res) {
        console.log(res);
    });
});


//test pc
DubboClient('172.19.65.33:2181')
  .getProvider('com.qianmi.pc.api.cat.CatQueryProvider')
  .then(function(provider) {
    provider.listAll({
      chainMasterId: 'A854899'
    }).then(function(res) {
      console.log(res);
    });
  });
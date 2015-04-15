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
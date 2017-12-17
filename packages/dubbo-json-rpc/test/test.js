var client = require('./dubbo-client');


var provider = 'com.ofpay.demo.api.UserProvider';

//简单的调用一个接口
client.getProvider(provider, function(err, userProvider) {
  err
    ? console.log(err)
    : userProvider.queryAll(function(err, data) {console.log(err, data);});
});


//group version support
client.getProvider(provider, 'test1', '2.1', function (err, userProvider) {
  err
    ? console.log(err)
    : userProvider.queryAll(function(err, data) {console.log(err, data);});
});
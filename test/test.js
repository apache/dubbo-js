var client = require('./dubbo-client');

//简单的调用一个接口
client
  .getProvider('com.ofpay.demo.api.UserProvider')
  .then(
    function success(userProvider) {
      userProvider
        .queryAll()
        .then(
          function success(res) {
            console.log(res);
          },
          function fail(err) {
            console.log(err)
          }
        );
    },
    function fail(err) {
      console.log(err);
    }
);

//添加group，和version的支持
client
  .getProvider('com.ofpay.demo.api.UserProvider', 'test1', '2.1')
  .then(
  function success(userProvider) {
    userProvider.queryAll().then(function (res) {
      console.log(res);
    })
  },
  function fail(err) {
    console.log(err);
  }
);


//
////test pc
setTimeout(function () {
  client
    .getProvider('com.qianmi.pc.api.brand.BrandQueryProvider')
    .then(function (provider) {
      provider.list({
        chainMasterId: 'A854899'
      }).then(function (res) {
        console.log(res);
      });
    });
}, 20000);

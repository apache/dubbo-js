var DubboClient = require('./index');

var dubboClient = DubboClient('172.19.65.33:2181');

//简单的调用一个接口
dubboClient
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
dubboClient
  .getProvider('com.ofpay.demo.api.UserProvider', 'test', '2.0')
  .then(
    function success(userProvider) {
      userProvider.queryAll().then(function(res) {
        console.log(res);
      })
    },
    function fail(err) {
      console.log(err);
    }
  );


//
////test pc
//dubboClient
//  .getProvider('com.qianmi.pc.api.brand.BrandQueryProvider')
//  .then(function(provider) {
//    provider.list({
//      chainMasterId: 'A854899'
//    }).then(function(res) {
//      console.log(res);
//    });
//  });
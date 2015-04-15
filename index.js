var Client = require('./jsonrpc-client');

/**
 * 返回一个对象
 */
register.getProvider('com.ofpay.demo.api.UserProvider').then(function(userProvider) {
  userProvider.queryAll();
});

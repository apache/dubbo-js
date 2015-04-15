/**
 * 封装Dubbo cleint， 通过json-rpc调用远程的dubbo服务
 */

var Promise = require('promise');
var rpc = require('node-json-rpc');
var ZookeeperRegistry = require('./zookeeper-registry');


/**
 * export DubboClient
 *
 * @type {DubboClient}
 */
module.exports = DubboClient;


/**
 *
 * Dubbo client
 *
 * @param url 注册中心的url
 * @param config zk的配置
 * @returns {DubboClient}
 * @constructor
 */
function DubboClient(url, config) {
  if (!(this instanceof DubboClient)) {
    return new DubboClient(url, config);
  }

  this.registry = ZookeeperRegistry(url, config);
}


/**
 * 获取provider的对象
 */
DubboClient.prototype.getProvider = function(provider) {

  /**
   * 封装rpc方法
   *
   * @param meta Provider的元数据
   * @param methodName 方法名称
   * @returns {Function}
   */
  var rpcMethod = function (meta, methodName) {
    return function() {
      var params = Array.prototype.slice.call(arguments);

      return new Promise(function (resolve, reject) {
        new rpc.Client(meta).call({
          'jsonrpc': '2.0',
          "method": methodName,
          "params": params,
          "id": 1
        }, function (err, res) {
          return err ? reject(err) : resolve(res);
        });
      });
    };
  };


  /**
   * 成功的返回调用对象
   *
   * @param resolve
   * @param reject
   * @returns {Function}
   */
  var success = function(resolve, reject) {

    return function(meta) {
      //获取provider包含哪些暴露的方法
      var methods = meta.methods;

      if (methods.length) {
        var providerObj = {};

        //动态的将provider暴露的方法动态挂载到providerObject上，使远程方法的调用更自然。
        methods.forEach(function(v) {
          providerObj[v] = rpcMethod(meta, v);
        });

        resolve(providerObj);
      } else {
        reject(new Error(':( ' +  provider + '没有暴露任何方法'));
      }
    }
  };


  /**
   * 获取provider失败
   *
   * @param reject
   * @returns {Function}
   */
  var fail = function(reject) {
    return function(err) {
      reject(err);
    }
  };


  var self = this;
  return new Promise(function(resolve, reject) {
    self.registry
        .getProviderMeta(provider)
        .then(
          success(resolve, reject),
          fail(reject)
        );
  });
};


/**
 * 封装Dubbo cleint， 通过json-rpc调用远程的dubbo服务
 */
'use strict';

var rpc = require('node-json-rpc');
var Registry = require('./zookeeper-registry');
var assert = require('assert');

module.exports = DubboClient;

/**
 *
 * @param url
 * @param config
 * 格式：
 * config = {
 * zk: {
 *     sessionTimeout: 30000,
 *     spinDelay : 1000,
 *     retries : 0
 * },
 * app: {
 *  application: '',
 *  'application.version': ''
 * }
 * }
 * @returns {DubboClient}
 * @constructor
 */
function DubboClient(url, config) {
  if (!(this instanceof DubboClient)) return new DubboClient(url, config);

  this._registry = Registry(url, config);
}

/**
 * 获取provider的对象
 */
DubboClient.prototype.getProvider = function(
  provider,
  group,
  version,
  callback,
) {
  assert.ok(arguments.length == 2 || arguments.length == 4, ' 参数错误');

  if (arguments.length == 2) {
    callback = group;
    group = '';
    version = '';
  }

  //rpc method
  var rpcMethod = function(provider, methodName) {
    return function() {
      var params = Array.prototype.slice.call(arguments);
      var last = params.slice(-1)[0];
      var isFn = typeof last === 'function';

      new rpc.Client(provider).call(
        {
          jsonrpc: '2.0',
          method: methodName,
          params: isFn ? params.slice(0, -1) : params,
          id: 1,
        },
        function(err, res) {
          isFn ? last(err, res) : '';
        },
      );
    };
  };

  //过滤出符合条件的provider
  var filterProvider = function(providers, callback) {
    var list = providers.filter(function(v) {
      return v.group === group && v.version === version;
    });

    var len = list.length;

    if (len) {
      //随机找到其中一个提供者
      var randomProvider = list[Math.floor(Math.random() * len)];

      if (randomProvider.methods.length > 0) {
        var providerObj = {};
        randomProvider.methods.forEach(function(method) {
          providerObj[method] = rpcMethod(randomProvider, method);
        });

        callback(null, providerObj);
      } else {
        callback(
          Error(
            [
              ':(, Not found exports method',
              provider + ', version:',
              version,
              ', group:',
              group,
            ].join(' '),
          ),
        );
      }
    } else {
      callback(
        Error(
          [
            ':(, Not found',
            provider + ', version:',
            version,
            ', group:',
            group,
          ].join(' '),
        ),
      );
    }
  };

  this._registry.getProvider(provider, function(err, providers) {
    if (err) {
      return callback(err);
    }
    filterProvider(providers, callback);
  });
};

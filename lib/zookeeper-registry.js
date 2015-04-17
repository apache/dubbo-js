/**
 * 使用node—zookeeper-client连接我们的dubbo注册中心
 * 然后解析出所有的服务信息，过滤出支持jsonrpc协议的服务
 * 以作为dubbo-client的数据源
 *
 * @of730
 */

"use strict";

var path = require('path');
var util = require('util');
var parse = require('url').parse;
var qs = require('querystring');
var ip = require('ip');
var Promise = require('promise');
var zookeeper = require('node-zookeeper-client');
var _ = require('./utils');


// 事件，当同步完成zk中的信息标志
var READY = 'ready';

//确保只有一个zk的client
var zkClient = null;

// 缓存provider的信息
var localCache = {};

/**
 * 暴露ZooKeeperRegistry,对象较重，只需new一次
 */
var registry = module.exports = {};


/**
 * 初始化注册中心信息
 *
 * @param url dubbo的注册中心地址
 * @param config, zk的配置信息
 *
 * 默认配置：
 *  {
 *   sessionTimeout: 30000,
 *   spinDelay : 1000,
 *   retries : 0
 * }
 */
registry.init = function (url, config) {
  if (zkClient) {
    return this;
  }

  // 创建zk的客户端连接对象
  zkClient = zookeeper.createClient(url, config);

  // 连接上zk
  zkClient.on('connected', function connected() {
    console.log('zk was connected.');
    zkClient.emit(READY);
  });

  // 连接失败
  zkClient.on('error', function error() {
    throw new Error('连接zookeeper注册中心失败');
  });

  // 失去连接
  zkClient.on('disconnected', function disconnected() {
    throw new Error(':(和zk失去了联系')
  });

  // 连接zk
  zkClient.connect();

  return this;
};


/**
 *
 * 得到provider的元信息，host，port, path, methods
 *
 * @provider, 服务的全路径名，如：com.ofpay.demo.api.UserProvider
 *
 * @return 返回一个新promise
 *
 * 如果没有找到任何provider对应的元数据，返回error，否则先根据随机算法，找到其中一个发送请求
 *
 */
registry.getProviderMeta = function(provider, group, version) {
  group = group || '';
  version = version || '';

  //过滤出符合条件的provider
  var filterProviderMeta = function(resolve, reject, providerList) {
    //如果传递了group和version那需要对prover的元信息进行过滤
    var list = providerList.filter(function(v) {
      return v.group === group && v.version === version;
    });

    var len = list.length;
    if (len) {
      //随机找到其中一个提供者
      return resolve(list[Math.floor(Math.random() * len)]);
    } else {
      reject(new Error([':(, Not found', provider + ', version:', version, ', group:', group].join(' ')));
    }
  };

  /**
   * 返回一个new promise
   */
  return new Promise(function(resolve, reject) {
    var providerList = localCache[provider];

    if (providerList) {
      console.log('==>', providerList.filter);
      filterProviderMeta(resolve, reject, providerList);
    } else {
      //waiting zk connected.
      zkClient.on(READY, function () {
        var zkPath = path.join('/dubbo', provider, 'providers');

        syncJSONRPCProvider(zkClient, zkPath).then(
          function success(cache) {
            if (cache) {
              //cache
              localCache = util._extend(localCache, cache);

              writeConsumer(provider);

              filterProviderMeta(resolve, reject, cache[provider]);
            } else {
              reject(new Error([':(, Not found', provider ].join(' ')));
            }
          },
          function fail(err) {
            reject(err);
          }
        );
      });
    }
  });
};


/**
 * 回写consumer信息
 * @param provider
 */
function writeConsumer(provider) {
  //write consumer
  var consumerPath = path.join('/dubbo', provider, 'consumers');

  _.ensureExists(zkClient, consumerPath).then(function(zkPath) {
    var params = {
      'interface': provider,
      'application': '',
      'application.version': '',
      'category': 'consumer',
      'dubbo': 'node-dubbo-1.0.0',
      'environment': 'production',
      'method': '',
      'owner': 'owner',
      'side': 'consumer',
      'pid': process.pid,
      'version': '1.0'
    };

    var consumerUrl = 'consumer://' + ip.address() + '/' + provider + '?' + qs.stringify(params);

    zkClient.create(zkPath + '/' + qs.escape(consumerUrl), new Buffer(''), zookeeper.CreateMode.EPHEMERAL, function(err, path){
      //console.log(err, path);
    });
  });
}



/**
 *
 * 解析jsonrpc的url，获取host，port，path
 *
 * @param url jsonrpc的url
 *
 * 例如：
 * jsonrpc://192.168.2.1:38080/com.ofpay.demo.api.UserProvider?anyhost=true
 * &application=demo-provider&default.timeout=10000&dubbo=2.4.10
 * &environment=product&interface=com.ofpay.demo.api.UserProvider
 * &methods=getUser,queryAll,queryUser,isLimit&owner=wenwu&pid=61578&side=provider&timestamp=1428904600188
 *
 */
function parseJSONRPC(url) {
  var rpc = parse(url);
  var query = qs.parse(url);
  var methods = (query['methods'] || '').split(',');
  var version = query.version || '';
  var group = query.group || '';

  return {
    host: rpc.hostname,
    port: rpc.port,
    path: rpc.pathname,
    methods: methods,
    version: version,
    group: group
  }
}


/**
 * 同步/dubbo下面所有的provider
 *
 * @param zkClient zk's zkClient
 */
function syncDubbo(zkClient) {
  /**
   * callback is hell, promise duang.
   */
  return new Promise(function (resolve, reject) {
    _.getChildren(zkClient, '/dubbo').then(
      function success(children) {
        resolve(children);
      },

      function fail(err) {
        console.log('failed to list children of %s due to :%s.', '/dubbo', err);
        reject(err);
      }
    );
  });
};


/**
 * 同步某provider下面，所有的服务url，过滤出jsonrpc协议
 *
 * @param zk's zkClient
 * @param zkPath, provider的完整路径，例如：
 *  /dubbo/com.ofpay.demo.api.UserProvider/providers
 */
function syncJSONRPCProvider(zkClient, zkPath) {
  /**
   * 订阅zookeep的更新推送
   */
  var subscribe = function(event) {
    console.log('Got watcher event：%s', event);

    //refresh provider cache
    var path = event.path;
    //remove /dubbo and /providers, only providerName
    var providerName = path.split('/')[2];

    if (localCache[providerName]) {
      syncJSONRPCProvider(zkClient, path).then(function(cache) {
        if (cache) {
          //cache it.
          localCache = util._extend(localCache, cache);
        } else {
          //delete it.
          delete localCache[providerName];
        }
      });
    }
  };

  /**
   * promise 再一次 duang.
   */
  return new Promise(function(resolve, reject) {
    _.getChildren(zkClient, zkPath, subscribe).then(
      function success(children) {
        //过滤出jsonrpc协议的provider
        var jsonRPCProviders =
          children
            .filter(function(v) {
              return qs.unescape(v).substring(0, 10) === 'jsonrpc://';
            })
            .map(function(v) {
              return parseJSONRPC(qs.unescape(v));
            });

        if (jsonRPCProviders.length) {
          //获取provider的名称，path格式为/dubbo/{provider}/providers
          var providerName = zkPath.split('/')[2];
          var cache = {};
          cache[providerName] = jsonRPCProviders;

          //返回
          resolve(cache);
        } else {
          resolve(null);
        }
      },

      function fail(err) {
        console.log('failed to list children of %s due to :%s.', zkPath, err);
        return reject(err);
      }
    );
  });
};


/**
 * 同步zk中的jsonrpc的服务
 */
function syncAllProviders(zkClient) {

  /**
   * 获取所有jsonroc协议的服务
   */
  return new Promise(function(resolve, reject) {
    syncDubbo(zkClient).then(function(providers) {
      ////创建所有的获取provider的children的promise
      var list = providers.map(function(v) {
        var zkPath = path.join('/dubbo', v, 'providers');
        return syncJSONRPCProvider(zkClient, zkPath);
      });

      //promise all
      Promise.all(list).then(
        function success(res) {
          var cacheAll = {};

          res.forEach(function(v) {
            if (v) {
              util._extend(cacheAll, v);
            }
          });
          resolve(cacheAll);
        }
      )
    })
  });
}

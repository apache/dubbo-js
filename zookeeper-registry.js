/**
 * 使用node—zookeeper-client连接我们的dubbo注册中心
 * 然后解析出所有的服务信息，过滤出支持jsonrpc协议的服务
 * 以作为dubbo-client的数据源
 *
 * @of730
 */

"use strict";
var path = require('path');
var parse = require('url').parse;
var querystring = require('querystring');
var EventEmitter = require('events').EventEmitter;

var Promise = require('promise');
var zookeeper = require('node-zookeeper-client');


// 事件，当同步完成zk中的信息标志
var READY = 'ready';

// 消息中心
var emitter = new EventEmitter();

// 缓存provider的信息
var providerCache = null;


/**
 * 暴露ZooKeeperRegistry,对象较重，只需new一次
 */
module.exports = ZooKeeperRegistry;


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
function ZooKeeperRegistry(url, config) {
  if (!(this instanceof ZooKeeperRegistry)) {
    return new ZooKeeperRegistry(url, config);
  }


  // 创建zk的客户端连接对象
  var client = zookeeper.createClient(url, config);


  // 当zk连接上， 获取zk中的jsonrpc的provider信息
   client.on('connected', function connected() {

     //同步jsonrpc的provider信息
     syncProviders(client).then(function(cache) {
       providerCache = cache;
       //通知getProvider，数据ok了。
       emitter.emit(READY);
     });
   });

  // 连接失败
  client.on('error', function error() {
    throw new Error('连接zookeeper注册中心失败');
  });


  // 和zk断开了连接
  client.on('disconnected', function disconnected() {
    throw new Error(':(和zk失去了联系');
  });


  //连接zk
  client.connect();
}


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
ZooKeeperRegistry.prototype.getProviderMeta = function(provider, group, version) {
  group = group || '';
  version = version || '';

  var meta = function(resolve, reject) {
    var meta = providerCache[provider];

    //如果没有provider的任何元数据
    if (typeof(meta) === 'undefined') {
      reject(new Error('Oops, 没有任何' + provider + '信息'));
    } else {
      //如果传递了group和version那需要对prover的元信息进行过滤
      meta = meta.filter(function(v) {
        return v.group === group && v.version === version;
      });
      var len = meta.length;
      if (len) { //随机找到其中一个提供者
        return resolve(meta[Math.floor(Math.random() * len)]);
      } else {
        reject(new Error(':(, Not found ' + provider + ', version: ' + version + ' , group: ' + group));
      }
    }

  };

  /**
   * 返回一个new promise
   */
  return new Promise(function(resolve, reject) {
    if (providerCache) {
      meta(resolve, reject);
    } else {
      //如果还没有同步完数据， 在这里等待通知
      emitter.on(READY, function() {
        meta(resolve, reject);
      });
    }
  });
};


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
  var query = querystring.parse(url);
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
 * 同步zk中的jsonrpc的服务
 */
function syncProviders(client) {

  /**
   * 同步/dubbo下面所有的provider
   *
   * @param client, zk's client
   */
  var syncDubbo = function(client) {

    /**
     * 订阅zookeep的更新推送
     */
    var subscribe = function(event) {
      console.log(event);
      console.log('Got watcher event：%s', event);
      //TODO refresh provider cache
    };


    /**
     * callback is hell, promise duang.
     */
    return new Promise(function(resolve, reject) {
      client.getChildren('/dubbo', subscribe,
        function syncDubboCallback(err, children, stat) {
          if (err) {
            console.log('failed to list children of %s due to :%s.', path, err);
            return reject(err);
          }

          //返回/dubbo目录下所有的provider
          resolve(children);
        }
      );
    });
  };


  /**
   * 同步某provider下面，所有的服务url，过滤出jsonrpc协议
   *
   * @param zk's client
   * @param path, provider的完整路径，例如：
   *  /dubbo/com.ofpay.demo.api.UserProvider/providers
   */
  var syncJSONRPCProvider = function(client, path) {

    /**
     * promise 再一次 duang.
     */
    return new Promise(function(resolve, reject) {
      client.getChildren(path,
        function(err, children, stat) {
          if (err) {
            console.log('failed to list children of %s due to :%s.', path, err);
            return reject(err);
          }

          //过滤出jsonrpc协议的provider
          var jsonRpc =
          children
            .filter(function(v) {
                return querystring.unescape(v).substring(0, 10) === 'jsonrpc://';
              })
            .map(function(v) {
              return parseJSONRPC(querystring.unescape(v));
            });

          if (jsonRpc.length) {
            //获取provider的名称，path格式为/dubbo/{provider}/providers
            var key = path.split('/')[2];

            var cache = {};
            cache[key] = jsonRpc;
            //返回
            resolve(cache);
          } else {
            resolve(null);
          }
        }
      )
    });
  };


  /**
   * 获取所有jsonroc协议的服务
   */
  return new Promise(function(resolve, reject) {
    syncDubbo(client)
      .then(function(providers) {

        //创建所有的获取provider的children的promise
        var list = providers.map(function(v) {
          var zkPath = path.join('/dubbo', v, 'providers');
          return syncJSONRPCProvider(client, zkPath);
        });

        //promise all
        Promise.all(list).then(function(res) {
          var cacheAll = {};

          for (var i = 0, len = res.length; i < len; i++) {
            var cache = res[i];
            if (cache) {
              Object.keys(cache).forEach(function(v) {
                cacheAll[v] = cache[v];
              });
            }
          }

        resolve(cacheAll);
      });
    })
  });
}

/**
 *
 */
'use strict';
var path = require('path');
var util = require('util');
var parse = require('url').parse;
var querystring = require('querystring');
var EventEmitter = require('events').EventEmitter;

var Promise = require('promise');
var zookeeper = require('node-zookeeper-client');
var rpc = require('node-json-rpc');


//创建消息调度emitter
var emitter = new EventEmitter();

//缓存provider的信息
var providerCache = null;


/**
 *
 */
module.exports = ZooKeeperRegistry;


/**
 *
 */
function ZooKeeperRegistry(url, config) {
  if (!(this instanceof ZooKeeperRegistry)) {
    return new ZooKeeperRegistry(url, config);
  }

  var client = zookeeper.createClient('172.19.65.33:2181');

  /**
   * handle connected
   */
   client.once('connected', function() {
     syncProviders(client).then(function(res) {
       providerCache = res;
       emitter.emit('ready');
     });
   });


  //connect
  client.connect();
}


ZooKeeperRegistry.prototype.getProvider = function(provider) {
  return new Promise(function(resolve, reject) {
    if (providerCache && providerCache[provider][0]) {
      var methods = providerCache[provider][0].methods;

      if (methods.length) {
        var providerObj = {};

        methods.forEach(function(v) {
          providerObj[v] = function(param) {
            console.log('call->', v);
            new rpc.Client(providerCache[provider][0]).call({
              "method": v,
              "param": param,
              "id": 1
            }, function(err, res) {
              console.log(err, res);
            })
          };
        });

        console.log(providerObj);

        resolve(providerObj);
      } else {
        reject(new Error(provider + '没有暴露任何方法'));
      }
    } else {
      console.log('waiting...');
      emitter.on('ready', function() {
        console.log('receive emitter');
        var methods = providerCache[provider][0].methods;

        if (methods.length) {
          var providerObj = {};

          methods.forEach(function(v) {
            providerObj[v] = function(param) {
              console.log('call->', v);
              new rpc.Client(providerCache[provider][0]).call({
                "method": v,
                "param": param,
                "id": 1
              }, function(err, res) {
                console.log(err, res);
              })
            };
          });

          console.log(providerObj);

          resolve(providerObj);
        }
      })
    }
  });
};


/**
 * 创建zk的客户端连接对象
 */
var client = zookeeper.createClient('172.19.65.33:2181');


/**
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
  var methods = (querystring.parse(url)['methods'] || '').split(',');

  return {
    host: rpc.hostname,
    port: rpc.port,
    path: rpc.pathname,
    methods: methods
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
    };

    /**
     * callback is hell, promise duang.
     */
    return new Promise(function(resolve, reject) {
      client.getChildren(
        '/dubbo',
        subscribe,
        function syncDubboCallback(err, children, stat) {
          if (err) {
            console.log('failed to list children of %s due to :%s.', path, err);
            return reject(err);
          }
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
     * promise
     */
    return new Promise(function(resolve, reject) {
      client.getChildren(
        path,
        function(err, children, stat) {
          if (err) {
            console.log('failed to list children of %s due to :%s.', path, err);
            return reject(err);
          }

          var jsonrpcChildren = children
              .filter(function(v) {
                  return querystring.unescape(v).substring(0, 10) == 'jsonrpc://';
                })
              .map(function(v) {
                return parseJSONRPC(querystring.unescape(v));
              });

          if (jsonrpcChildren.length) {
            var key = path.split('/')[2];

            var cache = {};
            cache[key] = jsonrpcChildren;
            resolve(cache);
          } else {
            resolve(null);
          }
        }
      )
    });
  };


  /**
   * 组合
   */
  return new Promise(function(resolve, reject) {
    syncDubbo(client)
      .then(function(children) {

        //创建所有的获取provider的children的promise
        var list = children.map(function(v) {
          var zkPath = path.join('/dubbo', v, 'providers');
          return syncJSONRPCProvider(client, zkPath);
        });

        //promise
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



ZooKeeperRegistry()
  .getProvider('com.ofpay.demo.api.UserProvider')
  .then(function(userProvier) {
    userProvier.queryAll();
  });

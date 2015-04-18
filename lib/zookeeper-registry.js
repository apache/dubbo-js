"use strict";
var path = require('path');
var util = require('util');
var url = require('url');
var qs = require('querystring');
var ip = require('ip');
var zookeeper = require('node-zookeeper-client');

module.exports = ZookeeperRegistry;


/**
 *
 * @param url
 * @param config
 * @returns {ZookeeperRegistry}
 * @constructor
 */
function ZookeeperRegistry(url, config) {
  if (!(this instanceof ZookeeperRegistry)) return new ZookeeperRegistry(url, config);
  config || (config = {});

  this._localCache = {};
  this._state = 'connecting';
  this._client = zookeeper.createClient(url, config['zk']);
  this._appConfig = config['app'];

  this._client.once('connected', function () {
    this._state = 'ready';
    this._client.emit(this._state);
  }.bind(this));

  this._client.connect();
}


/**
 * 获取provider的数据，判断当前zk-client是否连接成功
 *
 * @param provider
 * @param callback
 * @returns {*}
 */
ZookeeperRegistry.prototype.getProvider = function(provider, callback) {
  if (this._localCache[provider]) {
    return callback(null, this._localCache[provider]);
  }

  if (this._state === 'connecting') {
    this._client.once('ready', function () {
      this._syncProvider(provider, callback);
    }.bind(this));
  } else {
    this._syncProvider(provider, callback);
  }
};


/**
 * 订阅zookeep的更新推送
 */
ZookeeperRegistry.prototype.watcher = function(event) {
  //refresh provider cache
  var path = event.path;
  var provider = path.split('/')[2];

  if (this._localCache[provider]) {
    this._syncProvider(provider, function(err, data) {
      if (err && !data) return ;

      if (data.length) {
        //cache it.
        this._localCache = util._extend(this._localCache, data);
      } else {
        //delete it.
        delete this._localCache[provider];
      }
    }.bind(this));
  }
};

/**
 * 获取provide人的数据
 *
 * @param provider
 * @param callback
 * @private
 */
ZookeeperRegistry.prototype._syncProvider = function(provider, callback) {
  var providerPath = path.join('/dubbo', provider, 'providers');

  this._client.getChildren(
    providerPath,
    this.watcher.bind(this),
    function (err, children) {
      if (err) {
        return callback(err);
      }

      //过滤出jsonrpc协议的provider
      var providers = children
        .filter(function(v) {
          return qs.unescape(v).substring(0, 10) === 'jsonrpc://';
        })
        .map(function(v) {
          return _parseUrl(qs.unescape(v));
        });

      if (providers.length) {
        this._createConsumer(provider);
        //cache it.
        this._localCache[provider] = providers;
        callback(null, providers)
      } else {
        callback(new Error([':( Not found any', provider, ' with json-rpc'].join(' ')), [])
      }
  }.bind(this));
};


/**
 *
 * 解析jsonrpc的url，获取host，port，path
 *
 * @param rpcUrl jsonrpc的url
 *
 * 例如：
 * jsonrpc://192.168.2.1:38080/com.ofpay.demo.api.UserProvider?anyhost=true
 * &application=demo-provider&default.timeout=10000&dubbo=2.4.10
 * &environment=product&interface=com.ofpay.demo.api.UserProvider
 * &methods=getUser,queryAll,queryUser,isLimit&owner=wenwu&pid=61578&side=provider&timestamp=1428904600188
 *
 */
function _parseUrl(rpcUrl) {
  var rpc = url.parse(rpcUrl);
  var query = qs.parse(rpcUrl);

  return {
    host: rpc.hostname,
    port: rpc.port,
    path: rpc.pathname,
    methods: (query['methods'] || '').split(','),
    version: query.version || '',
    group: query.group || ''
  };
}


/**
 * 回写consumer信息
 *
 * @param provider
 */
ZookeeperRegistry.prototype._createConsumer = function (provider) {
  var consumers = path.join('/dubbo', provider, 'consumers');

  var params = util._extend({
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
  }, this._appConfig);

  var createConsumer = function() {
    var url = 'consumer://' + ip.address() + '/' + provider + '?' + qs.stringify(params);
    this._client.create(
      consumers + '/' + qs.escape(url), new Buffer(''),
      zookeeper.CreateMode.EPHEMERAL,
      function (err, path) {
        //console.log(err, path);
      });
  }.bind(this);

  this._client.exists(consumers, function (err, stats) {
    if (err) return;

    //存在节点
    if (stats) {
      createConsumer(provider);
    } else {
      this._client.create(consumers, function(err, status) {
        if (err) {
          return;
        }
        createConsumer(provider);
      });
    }
  }.bind(this))
};
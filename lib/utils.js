"use strict";
var Promise = require('promise');


/**
 * promise化，getChildren
 *
 * @param client
 * @param path
 * @param watch
 * @returns {*}
 */
exports.getChildren = function (client, path, watch) {
  return new Promise(function(resolve, reject) {
    client.getChildren(path, watch, function(err, children, stat) {
      err ? reject(err) : resolve(children);
    });
  });
};


/**
 * promise化，exists
 *
 * @param client
 * @param path
 * @returns {*}
 */
exports.exists = function (client, path) {
  return new Promise(function(resolve, reject) {
    client.exists(path, function(err, stats) {
      (err || !stat) ? reject(err || new Error(':(, '+path+' does not exists')) : resolve();
    });
  });
};


/**
 * 确信路径是否存在，如果不存在，则创建
 *
 * @param client
 * @param path
 */
exports.ensureExists = function(client, path) {
  return new Promise(function(resolve, reject) {
    client.exists(path, function(err, stats) {
      if (err) {
        return reject(err);
      }

      //不存在
      if (!stats) {
        client.create(path, function(err, path) {
          if (err) {
            return reject(err);
          }
          resolve(path);
        });
      } else {
        resolve(path);
      }
    });
  });
};

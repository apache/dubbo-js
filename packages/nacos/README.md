# nacos-sdk-nodejs

=======

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![David deps][david-image]][david-url]

[npm-image]: https://img.shields.io/npm/v/ali-ons.svg?style=flat-square
[npm-url]: https://npmjs.org/package/ali-ons
[travis-image]: https://img.shields.io/travis/ali-sdk/ali-ons.svg?style=flat-square
[travis-url]: https://travis-ci.org/ali-sdk/ali-ons
[david-image]: https://img.shields.io/david/ali-sdk/ali-ons.svg?style=flat-square
[david-url]: https://david-dm.org/ali-sdk/ali-ons

[Nacos](https://nacos.io/en-us/) Node.js SDK

## Install

```bash
npm install nacos --save
```

## Usage

### Service Discovery

```js
'use strict';

const NacosNamingClient = require('nacos').NacosNamingClient;
const logger = console;

const client = new NacosNamingClient({
  logger,
  serverList: '127.0.0.1:8848', // replace to real nacos serverList
  namespace: 'public',
});
await client.ready();

const serviceName = 'nodejs.test.domain';

// registry instance
await client.registerInstance(serviceName, {
  ip: '1.1.1.1',
  port: 8080,
});
await client.registerInstance(serviceName, {
  ip: '2.2.2.2',
  port: 8080,
});

// subscribe instance
client.subscribe(serviceName, hosts => {
  console.log(hosts);
});

// deregister instance
await client.deregisterInstance(serviceName, {
  ip: '1.1.1.1',
  port: 8080,
});
```

## APIs

### Service Discovery

- `registerInstance(serviceName, instance, [groupName])` Register an instance to service.
  - serviceName {String} Service name
  - instance {Instance}
    - ip {String} IP of instance
    - port {Number} Port of instance
    - [weight] {Number} weight of the instance, default is 1.0
    - [ephemeral] {Boolean} active until the client is alive, default is true
    - [clusterName] {String} Virtual cluster name
  - [groupName] {String} group name, default is `DEFAULT_GROUP`
- `deregisterInstance(serviceName, ip, port, [cluster])` Delete instance from service.
  - serviceName {String} Service name
  - instance {Instance}
    - ip {String} IP of instance
    - port {Number} Port of instance
    - [weight] {Number} weight of the instance, default is 1.0
    - [ephemeral] {Boolean} active until the client is alive, default is true
    - [clusterName] {String} Virtual cluster name
  - [groupName] {String} group name, default is `DEFAULT_GROUP`
- `getAllInstances(serviceName, [groupName], [clusters], [subscribe])` Query instance list of service.
  - serviceName {String} Service name
  - [groupName] {String} group name, default is `DEFAULT_GROUP`
  - [clusters] {String} Cluster names
  - [subscribe] {Boolean} whether subscribe the service, default is true
- `getServerStatus()` Get the status of nacos server, 'UP' or 'DOWN'.
- `subscribe(info, listener)` Subscribe the instances of the service
  - info {Object}|{String} service info, if type is string, it's the serviceName
  - listener {Function} the listener function
- `unSubscribe(info, [listener])` Unsubscribe the instances of the service
  - info {Object}|{String} service info, if type is string, it's the serviceName
  - listener {Function} the listener function, if not provide, will unSubscribe all listeners under this service

## Questions & Suggestions

Please let us know how can we help. Do check out [issues](https://github.com/nacos-group/nacos-sdk-nodejs/issues) for bug reports or suggestions first.

PR is welcome.

## License

[Apache License V2](LICENSE)

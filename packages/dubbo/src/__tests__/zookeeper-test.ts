// import {ZkClient} from '../zookeeper';
// import * as ip from 'ip';

// it('test connect', async () => {
//   const zkClient = new ZkClient({
//     application: {name: 'dubbo-zookeepere'},
//     register: 'localhost:2181',
//     interfaces: ['com.alibaba.dubbo.demo.DemoServic'],
//   });

//   const providers = await zkClient.getProviders(
//     'com.alibaba.dubbo.demo.DemoService',
//   );

//   const {host, port, timeout, dubboVersion, version, group} = providers[0];
//   expect(host).toEqual(ip.address());
//   expect(port).toEqual(20880);
//   expect(timeout).toEqual(0);
//   expect(dubboVersion).toEqual('2.0.0');
//   expect(version).toEqual('');
//   expect(group).toEqual('');
// });

// it('', () => {});

// (async () => {
//   const zkClient = ZkClient.from({
//     application: {name: 'dubbo-zookeepere'},
//     register: 'localhost:2181',
//     interfaces: ['com.alibaba.dubbo.demo.DemoService'],
//   });

//   //  await zkClient.getProviderMap();
//   // console.log(providerMap);
// })();

import * as zookeeper from 'node-zookeeper-client';

const client = zookeeper.createClient('localhost:2181');
const getChildren = (path, watch) => {
  client.getChildren(path, watch, (err, children) => {
    console.log(err);
    console.log(children);
  });
};

const watch = e => {
  console.log(e);
  getChildren('/dubbo/com.alibaba.dubbo.demo.DemoService/providers', watch);
};

client.on('connected', () => {
  console.log('conncted.');
  getChildren('/dubbo/com.alibaba.dubbo.demo.DemoService/providers', watch);
});

client.on('disconnected', () => {
  console.log('disconnected');
});

client.on('expired', () => {
  console.log('exipired');
});

client.connect();

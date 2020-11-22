/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const NacosNamingClient = require('../lib/naming/client');
const sleep = require('mz-modules/sleep');
const logger = console;

async function test() {
  const client = new NacosNamingClient({
    logger,
    serverList: '127.0.0.1:8848',
    namespace: 'public',
  });
  // await client._init()
  // await client.ready();

  // const serviceName = 'nodejs.test.nodejs.1';
  const serviceName = 'providers:org.apache.dubbo.demo.DemoProvider:1.0.0:';

  // console.log();
  // console.log('before', await client.getAllInstances(serviceName, ['NODEJS']));
  // console.log();

  // client.subscribe(serviceName, hosts => {
  //   console.log(hosts);
  // });

  await client.registerInstance(serviceName, {
    ip: '2.1.1.1',
    port: 9990,
  });
  // await client.registerInstance(serviceName, {
  //   ip: '2.2.2.2',
  //   port: 8080,
  // });

  const hosts = await client.getAllInstances(serviceName);
  const status = await client.getServerStatus();
  // console.log();
  console.log('0--------------------', hosts);
  console.log('1--------------------', status);
  // console.log();

  // await sleep(5000);

  // await client.deregisterInstance(serviceName, {
  //   ip: '1.1.1.1',
  //   port: 8080,
  // });
}

test().catch(err => {
  console.log(err);
});

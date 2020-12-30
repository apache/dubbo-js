/*
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

import debug from 'debug';
import {traceErr} from '../common/util';
import {
  IDubboConsumerRegistryProps,
  IDubboProviderRegistryProps,
  INaocsClientProps,
} from '../types';
import Registry from './registry';

const NacosNamingClient = require('nacos').NacosNamingClient;
// nacos debug
const log = debug('dubbo:nacos');
export class Nacos extends Registry<
  IDubboConsumerRegistryProps | IDubboProviderRegistryProps
> {
  constructor(
    nacosProps: INaocsClientProps,
    dubboProps: IDubboConsumerRegistryProps | IDubboProviderRegistryProps,
  ) {
    super(dubboProps);
    this._nacosProps = nacosProps;
    log(`new:|> %O`, {...this._nacosProps, ...dubboProps});
    this._nacosProps.nacosRoot = this._nacosProps.nacosRoot || 'dubbo';
    // init nacos client
    this._connect(this._init);
  }
  // nacos props
  private _nacosProps: INaocsClientProps;
  private _client: any;

  // nacos connect
  private _connect = async (callback: (err: Error) => void) => {
    const {url: register} = this._nacosProps;
    let u = register.split('nacos://')[1];
    log(`connecting nacosserver ${u}`);
    this._client = new NacosNamingClient({
      logger: console,
      serverList: u,
      namespace: 'public',
    });
    this._client.ready();
    callback(null);
  };

  private _init = async (err: Error) => {
    // nacos occur error
    if (err) {
      log(err);
      traceErr(err);
      this._subscriber.onError(err);
      return;
    }

    // if current nacos call from dubbo provider, registry provider service to nacos
    if (this._dubboProps.type === 'provider') {
      log(`this._dubboProps.type=${this._dubboProps.type}`);
      return;
    }

    // nacos connected
    let {interfaces, dubboSetting} = this._dubboProps;

    log(`this._dubboProps=${this._dubboProps}`);

    // 获取所有 provider
    for (let item of interfaces) {
      let obj = await dubboSetting.getDubboSetting(item);
      // providers:org.apache.dubbo.demo.DemoProvider:1.0.0:
      let inf = 'providers:' + item + ':' + obj.version + ':';
      const dubboServiceUrls = await this._client.getAllInstances(inf);
      // set dubbo interface meta info
      for (let {ip, port, metadata} of dubboServiceUrls) {
        this._dubboServiceUrlMap.set(metadata.path, {...metadata, ip, port});
      }
    }
    log(`this._dubboServiceUrlMap=${this._dubboServiceUrlMap}`);
    this._subscriber.onData(this._allAgentAddrSet);
  };

  /**
   * 获取所有的负载列表，通过 agentAddrMap 聚合出来
   */
  private get _allAgentAddrSet() {
    const agentSet = new Set<string>();
    for (let metaData of (this._dubboServiceUrlMap as any).values()) {
      agentSet.add(metaData.ip + ':' + metaData.port);
    }
    return agentSet;
  }
}

export default function nacos(props: INaocsClientProps) {
  return (
    dubboProps: IDubboProviderRegistryProps | IDubboConsumerRegistryProps,
  ) => new Nacos(props, dubboProps);
}

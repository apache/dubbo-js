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
// import { go } from '../common/go';
import {traceErr} from '../common/util';
import {
  IDubboConsumerRegistryProps,
  IDubboProviderRegistryProps,
  INaocsClientProps,
} from '../types';
import Registry from './registry';

const NacosNamingClient = require('nacos').NacosNamingClient;
// const NacosNamingClient = require('nacos')
const log = debug('dubbo:nacos');
export class Nacos extends Registry<
  IDubboConsumerRegistryProps | IDubboProviderRegistryProps
> {
  constructor(
    nacosProps: INaocsClientProps,
    dubboProp: IDubboConsumerRegistryProps | IDubboProviderRegistryProps,
  ) {
    super(dubboProp);
    this._nacosProps = nacosProps;
    log(`new:|> %O`, {...this._nacosProps, ...dubboProp});
    this._nacosProps.nacosRoot = this._nacosProps.nacosRoot || 'dubbo';
    // 初始化nacos的client
    this._connect(this._init);
  }
  // nacos 属性
  private _nacosProps: INaocsClientProps;
  private _client: any;

  // nacos 连接
  private async _connect(callback: (err: Error) => void) {
    const {url: register} = this._nacosProps;
    let u = register.split('nacos://')[1];
    log(`connecting nacosserver ${u}`);

    this._client = new NacosNamingClient({
      logger: console,
      serverList: u,
      namespace: 'public',
    });
    // const serviceName = 'providers:org.apache.dubbo.demo.DemoProvider:1.0.0:';
    // const hosts = await this._client.getAllInstances(serviceName);
    // const status = await this._client.getServerStatus();
    // console.log('0--------------------', hosts);
    // console.log('1--------------------', status);
  }

  private async _init(err: Error) {
    log(`88888888-------`);
    // nacos occur error
    if (err) {
      log(err);
      traceErr(err);
      this._subscriber.onError(err);
      return;
    }

    if (this._dubboProps.type === 'provider') {
      log(`this._dubboProps.type=${this._dubboProps.type}`);
      return;
    }

    // nacos connected
    const {nacosRoot} = this._nacosProps;
    const {
      application: {name},
      interfaces,
    } = this._dubboProps;

    log(`this._dubboProps=${this._dubboProps}`);

    //获取所有 provider
    for (let inf of interfaces) {
      // 当前接口在 nacos 中的路径
      const dubboServicePath = `/${nacosRoot}/${inf}/providers`;
      log(`dubboServicePath=${dubboServicePath}`);
      // 当前接口路径下的 dubbo url
      // const {res: dubboServiceUrls, err} = await go(
      //   this._getDubboServiceUrls(dubboServicePath, inf),
      // );

      // 重连进入init后不能清空已有provider, 会导致运行中的请求找到, 报no agents错误
      // 或者zk出现出错了, 无法获取provider, 那么之前获取的还能继续使用
      if (err) {
        log(`getChildren ${dubboServicePath} error ${err}`);
        traceErr(err);
        //If an error occurs, continue
        continue;
      }

      // set dubbo interface meta info
      // this._dubboServiceUrlMap.set(inf, dubboServiceUrls.map(DubboUrl.from));

      //写入 consumer 信息
      // this._createConsumer({
      //   name: name,
      //   dubboInterface: inf,
      // }).then(() => log('create Consumer finish'));
    }
    this._subscriber.onData(this._allAgentAddrSet);
  }

  /**
   * 获取所有的负载列表，通过agentAddrMap聚合出来
   * 这样有点Reactive的感觉，不需要考虑当中增加删除的动作
   */
  private get _allAgentAddrSet() {
    const agentSet = new Set() as Set<string>;
    for (let urlList of this._dubboServiceUrlMap.values()) {
      for (let url of urlList) {
        agentSet.add(url.host + ':' + url.port);
      }
    }
    return agentSet;
  }
}

// nacos属性 dubbo属性
export default function nacos(props: INaocsClientProps) {
  return (
    dubboProps: IDubboProviderRegistryProps | IDubboConsumerRegistryProps,
  ) => new Nacos(props, dubboProps);
}

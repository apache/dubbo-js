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
import ip from 'ip';
import zookeeper, {State} from 'node-zookeeper-client';
import qs from 'querystring';
import DubboUrl from '../consumer/dubbo-url';
import {
  ZookeeperDisconnectedError,
  ZookeeperExpiredError,
  ZookeeperTimeoutError,
} from '../common/err';
import {go} from '../common/go';
import {
  ICreateConsumerParam,
  IDubboConsumerRegistryProps,
  IDubboProviderRegistryProps,
  IZkClientProps,
} from '../types';
import {isDevEnv, msg, traceErr} from '../common/util';
import Registry from './registry';

const log = debug('dubbo:zookeeper');
const ipAddress = ip.address();
const CHECK_TIME = 30 * 1000;

export class ZkRegistry extends Registry<
  IDubboConsumerRegistryProps | IDubboProviderRegistryProps
> {
  constructor(
    zkProps: IZkClientProps,
    dubboProp: IDubboConsumerRegistryProps | IDubboProviderRegistryProps,
  ) {
    super(dubboProp);
    this._zkProps = zkProps;
    log(`new:|> %O`, {...this._zkProps, ...dubboProp});
    //默认dubbo
    this._zkProps.zkRoot = this._zkProps.zkRoot || 'dubbo';
    //初始化zookeeper的client
    this._connect(this._init);
  }

  private _checkTimer: NodeJS.Timer;
  private _client: zookeeper.Client;
  private _zkProps: IZkClientProps;

  //========================private method==========================
  private _init = async (err: Error) => {
    //zookeeper occur error
    if (err) {
      log(err);
      traceErr(err);
      this._subscriber.onError(err);
      return;
    }

    // if current zk call from dubbo provider, registry provider service to zookeeper
    if (this._dubboProps.type === 'provider') {
      this._registryProviderServices();
      return;
    }

    //zookeeper connected（may be occur many times）
    const {zkRoot} = this._zkProps;
    const {
      application: {name},
      interfaces,
    } = this._dubboProps;

    log(`this._dubboProps=${this._dubboProps.interfaces}`);

    //获取所有provider
    for (let inf of interfaces) {
      //当前接口在zookeeper中的路径
      const dubboServicePath = `/${zkRoot}/${inf}/providers`;
      //当前接口路径下的dubbo url
      const {res: dubboServiceUrls, err} = await go(
        this._getDubboServiceUrls(dubboServicePath, inf),
      );

      // 重连进入init后不能清空已有provider, 会导致运行中的请求找到, 报no agents错误
      // 或者zk出现出错了, 无法获取provider, 那么之前获取的还能继续使用
      if (err) {
        log(`getChildren ${dubboServicePath} error ${err}`);
        traceErr(err);
        //If an error occurs, continue
        continue;
      }

      // set dubbo interface meta info
      this._dubboServiceUrlMap.set(inf, dubboServiceUrls.map(DubboUrl.from));

      //写入consumer信息
      this._createConsumer({
        name: name,
        dubboInterface: inf,
      }).then(() => log('create Consumer finish'));
    }

    if (isDevEnv) {
      log('agentAddrSet: %O', this._allAgentAddrSet);
      log('dubboServiceUrl:|> %O', this._dubboServiceUrlMap);
    }

    this._subscriber.onData(this._allAgentAddrSet);
  };

  /**
   * 重连
   */
  private _reconnect() {
    clearInterval(this._checkTimer);
    if (this._client) {
      this._client.close();
    }
    this._connect(this._init);
  }

  /**
   * 由于zk自己的监测机制不明确, 改为自主检测
   */
  private _monitor() {
    clearInterval(this._checkTimer);
    this._checkTimer = setInterval(() => {
      const state = this._client.getState();
      switch (state) {
        case State.EXPIRED:
        case State.DISCONNECTED:
          log(`checker is error, state is ${state}, need reconnect`);
          this._reconnect();
          break;
        default:
          log(`checker is ok, state is ${state}`);
      }
    }, CHECK_TIME);
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

  /**
   * 获取所有的provider列表
   * @param {string} dubboServicePath
   * @param dubboInterface
   * @returns {Promise<Array<string>>}
   * @private
   */
  private async _getDubboServiceUrls(
    dubboServicePath: string,
    dubboInterface: string,
  ): Promise<Array<string>> {
    return this._getChildren(
      dubboServicePath,
      this._watchWrap(dubboServicePath, dubboInterface),
    ).then(res => {
      return (res.children || [])
        .map(child => decodeURIComponent(child))
        .filter(child => child.startsWith('dubbo://'));
    });
  }

  //========================zookeeper helper=========================
  /**
   * connect zookeeper
   */
  private _connect = (callback: (err: Error) => void) => {
    const {url: register, zkAuthInfo} = this._zkProps;
    //debug log
    log(`connecting zkserver ${register}`);

    // remove all listeners, avoid memory leak
    if (this._client) {
      this._client.removeAllListeners();
    }

    //connect
    this._client = zookeeper.createClient(register, {
      retries: 10,
    });

    // add auth info
    if (zkAuthInfo && zkAuthInfo.scheme && zkAuthInfo.auth) {
      this._client.addAuthInfo(zkAuthInfo.scheme, Buffer.from(zkAuthInfo.auth));
    }

    //手动做一个超时检测
    //node-zookeeper-client启动时候有个bug，当连不上zk时会无限重连
    const timeId = setTimeout(() => {
      log(`Could not connect zk ${register}， time out`);
      this._client.close();
      callback(
        new ZookeeperTimeoutError(
          `ZooKeeper was connected ${register} time out. `,
        ),
      );
    }, 30 * 1000);

    this._client.once('connected', () => {
      log(`connected to zkserver ${register}`);
      clearTimeout(timeId);
      callback(null);
      msg.emit('sys:ready');
      this._monitor();
    });

    //the connection between client and server is dropped.
    this._client.once('disconnected', () => {
      log(`zk ${register} had disconnected`);
      clearTimeout(timeId);
      traceErr(
        new ZookeeperDisconnectedError(
          `ZooKeeper was disconnected. current state is ${this._client.getState()} `,
        ),
      );
      this._reconnect();
    });

    this._client.once('expired', () => {
      clearTimeout(timeId);
      log(`zk ${register} had session expired`);
      traceErr(
        new ZookeeperExpiredError(
          `Zookeeper was session Expired Error current state ${this._client.getState()}`,
        ),
      );
      this._client.close();
    });

    //connect
    this._client.connect();
  };

  private _watchWrap(dubboServicePath: string, dubboInterface: string) {
    return async (e: zookeeper.Event) => {
      log(`trigger watch ${e}`);

      //会有概率性的查询节点为空，可以延时一些时间
      // await delay(2000);

      const {res: dubboServiceUrls, err} = await go(
        this._getDubboServiceUrls(dubboServicePath, dubboInterface),
      );

      // when getChildren had occur error
      if (err) {
        log(`getChildren ${dubboServicePath} error ${err}`);
        traceErr(err);
        return;
      }

      const urls = dubboServiceUrls.map(serviceUrl =>
        DubboUrl.from(serviceUrl),
      );
      if (urls.length === 0) {
        traceErr(new Error(`trigger watch ${e} agentList is empty`));
        return;
      }
      //clear current dubbo interface
      this._dubboServiceUrlMap.set(dubboInterface, urls);

      if (isDevEnv) {
        log('agentSet:|> %O', this._allAgentAddrSet);
        log(
          'update dubboInterface %s providerList %O',
          dubboInterface,
          this._dubboServiceUrlMap.get(dubboInterface),
        );
      }

      this._subscriber.onData(this._allAgentAddrSet);
    };
  }

  private _getChildren = (
    path: string,
    watch: (e: zookeeper.Event) => void,
  ): Promise<{children: Array<string>; stat: zookeeper.Stat}> => {
    return new Promise((resolve, reject) => {
      this._client.getChildren(path, watch, (err, children, stat) => {
        if (err) {
          reject(err);
          return;
        }

        resolve({
          children,
          stat,
        });
      });
    });
  };

  private async _registryProviderServices() {
    const {zkRoot} = this._zkProps;
    const services = (this._dubboProps as IDubboProviderRegistryProps).services;

    for (let [dubboInterface, dubboUrl] of services) {
      const providerRoot = `/${zkRoot}/${dubboInterface}/providers`;

      // create provider root path
      const err = await this._createDubboRootPath(providerRoot);
      if (err) {
        log(`create root provider ${providerRoot} %o`, err);
        continue;
      }

      dubboUrl = `${providerRoot}/${dubboUrl}`;
      const existProviderPath = await go(this._exists(dubboUrl));
      if (existProviderPath.err) {
        log(
          `check ${dubboUrl} err: %o , exists: %s`,
          existProviderPath.err,
          existProviderPath.res,
        );
        continue;
      }
      const create = await go(
        this._create(dubboUrl, zookeeper.CreateMode.EPHEMERAL),
      );

      if (create.err) {
        log(`${decodeURIComponent(dubboUrl)} 创建失败 %o`, create.err);
        return;
      }

      log(`create successfully provider url: ${decodeURIComponent(dubboUrl)}`);
    }
  }

  /**
   * com.alibaba.dubbo.registry.zookeeper.ZookeeperRegistry
   */
  private async _createConsumer(params: ICreateConsumerParam) {
    let {name, dubboInterface} = params;

    const dubboSetting = (this
      ._dubboProps as IDubboConsumerRegistryProps).dubboSetting.getDubboSetting(
      dubboInterface,
    );

    if (!dubboSetting) {
      throw new Error(
        `Could not find group, version for ${dubboInterface} please check your dubbo setting`,
      );
    }

    const queryParams = {
      interface: dubboInterface,
      application: name,
      category: 'consumers',
      method: '',
      revision: '',
      version: dubboSetting.version,
      group: dubboSetting.group,
      side: 'consumer',
      check: 'false',
    };

    //create root comsumer
    const consumerRoot = `/${this._zkProps.zkRoot}/${dubboInterface}/consumers`;
    const err = await this._createDubboRootPath(consumerRoot);
    if (err) {
      log('create root consumer: error %o', err);
      return;
    }

    //create comsumer
    const consumerUrl =
      consumerRoot +
      '/' +
      encodeURIComponent(
        `consumer://${ipAddress}/${dubboInterface}?${qs.stringify(
          queryParams,
        )}`,
      );
    const exist = await go(this._exists(consumerUrl));
    if (exist.err) {
      log(`check consumer url: ${decodeURIComponent(consumerUrl)} failed`);
      return;
    }

    if (exist.res) {
      log(
        `check consumer url: ${decodeURIComponent(consumerUrl)} was existed.`,
      );
      return;
    }

    const create = await go(
      this._create(consumerUrl, zookeeper.CreateMode.EPHEMERAL),
    );

    if (create.err) {
      log(
        `check consumer url: ${decodeURIComponent(
          consumerUrl,
        )}创建consumer失败 %o`,
        create.err,
      );
      return;
    }

    log(`create successfully consumer url: ${decodeURIComponent(consumerUrl)}`);
  }

  private async _createDubboRootPath(dir: string) {
    let {res, err} = await go(this._exists(dir));
    //check error
    if (err) {
      return err;
    }

    // current consumer root path was existed.
    if (res) {
      return null;
    }

    //create current consumer path
    ({err} = await go(this._mkdirp(dir)));
    if (err) {
      return err;
    }

    log('create root path %s successfull', dir);
  }

  private _create = (path: string, mode: number): Promise<string> => {
    return new Promise((resolve, rejec) => {
      this._client.create(path, mode, (err, path) => {
        if (err) {
          rejec(err);
          return;
        }
        resolve(path);
      });
    });
  };

  private _exists = (path: string): Promise<zookeeper.Stat> => {
    return new Promise((resolve, reject) => {
      this._client.exists(path, (err, stat) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(stat);
      });
    });
  };

  private _mkdirp(dir: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this._client.mkdirp(dir, (err, path) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(path);
      });
    });
  }
}

export default function zk(props: IZkClientProps) {
  return (
    dubboProps: IDubboConsumerRegistryProps | IDubboProviderRegistryProps,
  ) => new ZkRegistry(props, dubboProps);
}

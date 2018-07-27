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
import zookeeper from 'node-zookeeper-client';
import qs from 'querystring';
import Context from './context';
import DubboUrl from './dubbo-url';
import {
  ZookeeperDisconnectedError,
  ZookeeperExpiredError,
  ZookeeperTimeoutError,
} from './err';
import {go} from './go';
import {IObservable, IRegistrySubscriber, IZkClientProps} from './types';
import {eqSet, isDevEnv, msg, noop, traceErr, traceInfo} from './util';

const log = debug('dubbo:zookeeper');
const ipAddress = ip.address();

export type TAgentAddr = string;
export type TDubboInterface = string;

export class ZkRegistry implements IObservable<IRegistrySubscriber> {
  private constructor(props: IZkClientProps) {
    log(`new:|> %O`, props);
    this._props = props;
    //默认dubbo
    this._props.zkRoot = this._props.zkRoot || 'dubbo';
    //保存dubbo接口和服务url之间的映射关系
    this._dubboServiceUrlMap = new Map();
    this._agentAddrSet = new Set();
    //初始化订阅者
    this._subscriber = {
      onData: noop,
      onError: noop,
    };
    //初始化zookeeper的client
    this._connect(this._init);
  }

  private _agentAddrSet: Set<string>;
  private _client: zookeeper.Client;
  private _subscriber: IRegistrySubscriber;
  private readonly _props: IZkClientProps;
  private readonly _dubboServiceUrlMap: Map<TDubboInterface, Array<DubboUrl>>;

  //===========================public method=============================
  static from(props: IZkClientProps) {
    return new ZkRegistry(props);
  }

  /**
   * 根据dubbo调用上下文interface, group, version等，获取负载列表
   * @param ctx dubbo调用上下文
   */
  getAgentAddrList(ctx: Context) {
    const {dubboInterface, version, group} = ctx;
    return this._dubboServiceUrlMap
      .get(dubboInterface)
      .filter(serviceProp => {
        const isSameVersion = serviceProp.version === version;
        //如果Group为null，就默认匹配， 不检查group
        //如果Group不为null，确保group和接口的group一致
        const isSameGroup = !group || group === serviceProp.group;
        return isSameGroup && isSameVersion;
      })
      .map(({host, port}) => `${host}:${port}`);
  }

  /**
   * 根据dubbo调用上下文获取服务提供者的信息
   * @param ctx
   */
  getDubboServiceProp(ctx: Context) {
    let {dubboInterface, version, group, invokeHost, invokePort} = ctx;
    const dubboServicePropList = this._dubboServiceUrlMap.get(dubboInterface);
    for (let prop of dubboServicePropList) {
      const isSameHost = prop.host === invokeHost;
      const isSamePort = prop.port === invokePort;
      const isSameVersion = prop.version === version;
      //如果Group为null，就默认匹配， 不检查group
      //如果Group不为null，确保group和接口的group一致
      const isSameGroup = !group || group === prop.group;

      if (isSameHost && isSamePort && isSameVersion && isSameGroup) {
        log('getProviderProps:|> %s', prop);
        return prop;
      }
    }
  }

  /**
   * 订阅者
   * @param subscriber
   */
  subscribe(subscriber: IRegistrySubscriber) {
    this._subscriber = subscriber;
    return this;
  }

  //========================private method==========================
  private _init = async (err: Error) => {
    //zookeeper occur error
    if (err) {
      log(err);
      traceErr(err);
      this._subscriber.onError(err);
      return;
    }

    //zookeeper connected（may be occur many times）
    const {
      zkRoot,
      application: {name},
      interfaces,
    } = this._props;

    //获取所有provider
    for (let inf of interfaces) {
      //当前接口在zookeeper中的路径
      const dubboServicePath = `/${zkRoot}/${inf}/providers`;
      //当前接口路径下的dubbo url
      const dubboServiceUrls = await this._getDubboServiceUrls(
        dubboServicePath,
        inf,
      );

      //init
      this._dubboServiceUrlMap.set(inf, []);

      for (let serviceUrl of dubboServiceUrls) {
        const url = DubboUrl.from(serviceUrl);
        const {host, port, dubboVersion, version} = url;
        this._dubboServiceUrlMap.get(inf).push(url);

        //写入consume信息
        this._createConsumer({
          host: host,
          port: port,
          name: name,
          dubboInterface: inf,
          dubboVersion: dubboVersion,
          version: version,
        }).then(() => log('create Consumer finish'));
      }
    }

    if (isDevEnv) {
      log('agentAddrSet: %O', this._allAgentAddrSet);
      log('dubboServiceUrl:|> %O', this._dubboServiceUrlMap);
    }

    this._agentAddrSet = this._allAgentAddrSet;
    this._subscriber.onData(this._allAgentAddrSet);
  };

  /**
   * get current all agent address
   */
  get allAgentAddrSet() {
    return this._agentAddrSet;
  }

  /**
   * 获取所有的负载列表，通过agentAddrMap聚合出来
   * 这样有点Reactive的感觉，不需要考虑当中增加删除的动作
   */
  private get _allAgentAddrSet() {
    const agentSet = new Set();
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
    const {res, err} = await go(
      this._getChildren(
        dubboServicePath,
        this._watch(dubboServicePath, dubboInterface),
      ),
    );

    if (err) {
      log(`getChildren ${dubboServicePath} error ${err}`);
      traceErr(err);
      return [];
    }

    if (!res.children || res.children.length === 0) {
      traceErr(
        new Error(
          `zk get DubboSericeUrls result is empty with service path ${dubboServicePath} and interface ${dubboInterface}.`,
        ),
      );
    }

    return (res.children || [])
      .map(child => decodeURIComponent(child))
      .filter(child => child.startsWith('dubbo://'));
  }

  //========================zookeeper helper=========================
  /**
   * connect zookeeper
   */
  private _connect = (callback: (err: Error) => void) => {
    const {register} = this._props;
    //debug log
    log(`connecting zkserver ${register}`);
    //connect
    this._client = zookeeper.createClient(register, {
      retries: 10,
      sessionTimeout: 60 * 1000,
    });

    //超时检测
    //node-zookeeper-client,有个bug，当连不上zk时会无限重连
    //手动做一个超时检测
    const {retries, sessionTimeout} = (this._client as any).options;
    const timeId = setTimeout(() => {
      log(`Could not connect zk ${register}， time out`);
      this._client.close();
      callback(
        new ZookeeperTimeoutError(
          `ZooKeeper was connected ${register} time out. `,
        ),
      );
    }, retries * sessionTimeout);

    //connected
    this._client.once('connected', () => {
      log(`connected to zkserver ${register}`);
      clearTimeout(timeId);
      callback(null);
      msg.emit('sys:ready');
    });

    //in order to trace connect info
    this._client.on('connected', () => {
      traceInfo(
        `connected to zkserver ${register} current state is ${this._client.getState()}`,
      );
      callback(null);
    });

    //the connection between client and server is dropped.
    this._client.on('disconnected', () => {
      log(`zk ${register} had disconnected`);
      clearTimeout(timeId);
      callback(
        new ZookeeperDisconnectedError(
          `ZooKeeper was disconnected. current state is ${this._client.getState()} `,
        ),
      );
    });

    this._client.on('expired', () => {
      log(`zk ${register} had disconnected`);
      callback(
        new ZookeeperExpiredError(
          `Zookeeper was session Expired Error current state ${this._client.getState()}`,
        ),
      );
      //connect retry
      this._client.connect();
    });

    //connect
    this._client.connect();
  };

  private _watch(dubboServicePath: string, dubboInterface: string) {
    //@ts-ignore
    return async (e: zookeeper.Event) => {
      log(`trigger watch ${e}`);

      const dubboServiceUrls = await this._getDubboServiceUrls(
        dubboServicePath,
        dubboInterface,
      );

      //clear current dubbo interface
      const agentAddrList = [];
      this._dubboServiceUrlMap.set(dubboInterface, []);
      for (let serviceUrl of dubboServiceUrls) {
        const url = DubboUrl.from(serviceUrl);
        const {host, port, dubboVersion, version} = url;
        agentAddrList.push(`${host}:${port}`);
        this._dubboServiceUrlMap.get(dubboInterface).push(url);

        this._createConsumer({
          host: host,
          port: port,
          name: this._props.application.name,
          dubboInterface: dubboInterface,
          dubboVersion: dubboVersion,
          version: version,
        }).then(() => log('create consumer finish'));
      }

      if (agentAddrList.length === 0) {
        traceErr(new Error(`trigger watch ${e} agentList is empty`));
      } else {
        traceInfo(`trigger watch ${e} agentList ${agentAddrList.join(',')}`);
      }

      if (isDevEnv) {
        log('agentSet:|> %O', this._allAgentAddrSet);
        log(
          'update dubboInterface %s providerList %O',
          dubboInterface,
          this._dubboServiceUrlMap.get(dubboInterface),
        );
      }

      if (!eqSet(this._agentAddrSet, this._allAgentAddrSet)) {
        this._agentAddrSet = this._allAgentAddrSet;
        this._subscriber.onData(this._allAgentAddrSet);
      } else {
        log('no agent change');
      }
    };
  }

  private _getChildren = (
    path: string,
    watch?: (e: zookeeper.Event) => void,
  ): Promise<{children: Array<string>; stat: zookeeper.Stat}> => {
    if (!watch) {
      watch = () => {};
    }
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

  /**
   * com.alibaba.dubbo.registry.zookeeper.ZookeeperRegistry
   */
  private async _createConsumer(params: {
    host: string;
    port: number;
    name: string;
    dubboInterface: string;
    dubboVersion: string;
    version: string;
  }) {
    let {host, port, name, dubboInterface, dubboVersion, version} = params;
    const queryParams = {
      host,
      port,
      interface: dubboInterface,
      application: name,
      category: 'consumers',
      dubbo: dubboVersion,
      method: '',
      revision: '',
      version: version,
      side: 'consumer',
      check: 'false',
    };

    const consumerRoot = `/dubbo/${dubboInterface}/consumers`;
    const err = await this._createRootConsumer(consumerRoot);
    if (err) {
      log('create root consumer %o', err);
      return;
    }

    const consumerUrl =
      consumerRoot +
      '/' +
      encodeURIComponent(
        `consumer://${ipAddress}/${dubboInterface}?${qs.stringify(
          queryParams,
        )}`,
      );

    const exist = await go(this._exists(consumerUrl));
    if (exist.err || exist.res) {
      log(`check consumer url: ${consumerUrl}失败或者consumer已经存在`);
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

  private async _createRootConsumer(consumer: string) {
    const {res, err} = await go(this._exists(consumer));
    if (err) {
      log(`consumer exisit ${consumer} %o`, err);
      return err;
    }

    //如果没有
    if (!res) {
      const {err} = await go(
        this._create(consumer, zookeeper.CreateMode.PERSISTENT),
      );
      if (err) {
        log(`create consumer#${consumer} successfully`);
        return err;
      }
    }
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
}

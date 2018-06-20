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
import {ZookeeperDisconnectedError, ZookeeperTimeoutError} from './err';
import {msg, MSG_TYPE} from './msg';
import {to} from './to';
import {IObservable, IZkClientProps, IZookeeperSubscriber} from './types';
import {isDevEnv, noop} from './util';

const log = debug('dubbo:zookeeper');

export type TAgentAddr = string;
export type TDubboInterface = string;

export class ZkClient implements IObservable<IZookeeperSubscriber> {
  constructor(props: IZkClientProps) {
    log(`new:|> %O`, props);
    this._props = props;
    //默认dubbo
    this._props.zkRoot = this._props.zkRoot || 'dubbo';
    //保存接口和负载之间的映射
    this._agentMap = new Map();
    //保存dubbo接口和服务url之间的映射关系
    this._dubboServiceUrlMap = new Map();
    //当前的ip
    this._ipAddress = ip.address();
    this._subscriber = {
      onData: noop,
      onError: noop,
    };
    //初始化zookeeper的client
    this._init().then(() => log('init providerMap and agentSet'));
  }

  private _client: zookeeper.Client;
  private _subscriber: IZookeeperSubscriber;
  private readonly _props: IZkClientProps;
  private readonly _ipAddress: string;
  private readonly _agentMap: Map<TDubboInterface, Set<TAgentAddr>>;
  private readonly _dubboServiceUrlMap: Map<TDubboInterface, Array<DubboUrl>>;

  //===========================public method=============================
  static from(props: IZkClientProps) {
    return new ZkClient(props);
  }

  /**
   * 根据dubbo调用上下文interface, group, version等，获取负载列表
   * @param ctx dubbo调用上下文
   */
  getAgentAddrList(ctx: Context) {
    const {dubboInterface, version, group} = ctx;
    return (this._dubboServiceUrlMap.get(dubboInterface) || [])
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
  subscribe(subscriber: IZookeeperSubscriber) {
    this._subscriber = subscriber;
    return this;
  }

  //========================private method==========================
  private async _init(): Promise<null> {
    const {
      zkRoot,
      application: {name},
      interfaces,
    } = this._props;

    //等待连接zookeeper
    const {err} = await to(this._connect());
    if (err) {
      log(`connect zk error ${err}`);
      this._subscriber.onError(err);
      return;
    }

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
      this._agentMap.set(inf, new Set());
      this._dubboServiceUrlMap.set(inf, []);

      for (let serviceUrl of dubboServiceUrls) {
        const url = DubboUrl.from(serviceUrl);
        const {host, port, dubboVersion, version} = url;
        const agentServerAddr = `${host}:${port}`;
        this._agentMap.get(inf).add(agentServerAddr);
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

    log('agentAddrSet: %O', this._allAgentAddrSet);
    if (isDevEnv) {
      log('dubboServiceUrl:|> %O', this._dubboServiceUrlMap);
    }
    this._subscriber.onData(this._allAgentAddrSet);
  }

  private get _allAgentAddrSet() {
    const set = new Set();
    for (let agentAddrSet of this._agentMap.values()) {
      for (let agentAddr of agentAddrSet) {
        set.add(agentAddr);
      }
    }
    return set;
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
    const {res, err} = await to(
      this._getChildren(
        dubboServicePath,
        this._watch(dubboServicePath, dubboInterface),
      ),
    );

    if (err) {
      log(`getChildren ${dubboServicePath} error ${err}`);
      return [];
    }

    return (res.children || [])
      .map(child => decodeURIComponent(child))
      .filter(child => child.startsWith('dubbo://'));
  }

  //========================zookeeper helper=========================
  /**
   * connect zookeeper
   * @returns {Promise<Error>}
   */
  private _connect(): Promise<Error | null> {
    return new Promise((resolve, reject) => {
      const {register} = this._props;

      log(`connecting zkserver ${register}`);
      this._client = zookeeper.createClient(register, {
        retries: 3,
        sessionTimeout: 10 * 1000,
      });

      //超时检测
      //node-zookeeper-client,有个bug，当连不上zk时会无限重连
      //手动做一个超时检测
      const {retries, sessionTimeout} = (this._client as any).options;
      const timeId = setTimeout(() => {
        log(`Could not connect zk ${register}， time out`);
        this._client.close();
        const err = new ZookeeperTimeoutError(
          `ZooKeeper was connected ${register} time out. `,
        );
        reject(err);

        //通知外部，比如对接钉钉机器人
        msg.emit(MSG_TYPE.SYS_ERR, err);
      }, retries * sessionTimeout);

      //connected
      this._client.once('connected', () => {
        log(`connected to zkserver ${register}`);
        clearTimeout(timeId);
        resolve(null);

        //通知外部，比如对接钉钉机器人
        msg.emit(MSG_TYPE.SYS_READY);
      });

      //the connection between client and server is dropped.
      this._client.once('disconnected', () => {
        log(`zk ${register} had disconnected`);
        const err = new ZookeeperDisconnectedError(
          'ZooKeeper was disconnected.',
        );
        this._subscriber.onError(err);
        //通知外部，比如对接钉钉机器人
        msg.emit(MSG_TYPE.SYS_ERR, err);
        clearTimeout(timeId);
      });

      //connect
      this._client.connect();
    });
  }

  private _watch(dubboServicePath: string, dubboInterface: string) {
    //@ts-ignore
    return async (e: zookeeper.Event) => {
      log(`trigger watch ${dubboServicePath}, type: %s`, e.getName());

      const dubboServiceUrls = await this._getDubboServiceUrls(
        dubboServicePath,
        dubboInterface,
      );
      //clear current dubbo interface
      this._agentMap.get(dubboInterface).clear();
      this._dubboServiceUrlMap.set(dubboInterface, []);

      for (let serviceUrl of dubboServiceUrls) {
        const url = DubboUrl.from(serviceUrl);
        const {host, port, dubboVersion, version} = url;
        const agentServerAddr = `${host}:${port}`;
        this._agentMap.get(dubboInterface).add(agentServerAddr);
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

      log('agentSet:|> %O', this._allAgentAddrSet);
      if (isDevEnv) {
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
      timestamp: Date.now(),
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
        `consumer://${this._ipAddress}/${dubboInterface}?${qs.stringify(
          queryParams,
        )}`,
      );

    const exist = await to(this._exists(consumerUrl));
    if (exist.err || exist.res) {
      log(`check consumer url: ${consumerUrl}失败或者consumer已经存在`);
      return;
    }

    const create = await to(
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
    const {res, err} = await to(this._exists(consumer));
    if (err) {
      log(`consumer exisit ${consumer} %o`, err);
      return err;
    }

    //如果没有
    if (!res) {
      const {err} = await to(
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

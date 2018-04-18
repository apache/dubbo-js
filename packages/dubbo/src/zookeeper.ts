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
import url from 'url';
import {to} from './to';
import {
  IProviderProps,
  IZkClientProps,
  IObservable,
  IZookeeperSubscriber,
} from './types';
import {ZookeeperDisconnectedError, ZookeeperTimeoutError} from './err';
import Context from './context';
import {msg, MSG_TYPE} from './msg';

const log = debug('dubbo:zookeeper');
const noop = () => {};

export type TAgentHostPort = string;
export type TDubboInterface = string;

export class ZkClient implements IObservable<IZookeeperSubscriber> {
  constructor(props: IZkClientProps) {
    log(`init props %O`, props);
    this._props = props;
    this._props.zkRoot = this._props.zkRoot || 'dubbo';
    this._agentMap = new Map();
    this._providerMap = new Map();
    this._subscriber = {
      onData: noop,
      onError: noop,
    };
    this._init().then(() => log('init providerMap and agentSet'));
  }

  private readonly _props: IZkClientProps;
  private _client: zookeeper.Client;
  private _subscriber: IZookeeperSubscriber;
  private _agentMap: Map<TDubboInterface, Array<TAgentHostPort>>;
  private readonly _providerMap: Map<TDubboInterface, Array<IProviderProps>>;

  static from(props: IZkClientProps) {
    return new ZkClient(props);
  }

  async _init(): Promise<null> {
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
      const providerPath = `/${zkRoot}/${inf}/providers`;
      const providers = (await this._getProviderList(providerPath, inf)) || [];
      const providerMetaList = providers.map(ZkClient.parseUrl);

      for (let providerProp of providerMetaList) {
        const {host, port, dubboVersion, version} = providerProp;
        const agentHost = `${host}:${port}`;

        if (this._providerMap.get(inf)) {
          this._agentMap.get(inf).push(agentHost);
          this._providerMap.get(inf).push(providerProp);
        } else {
          this._agentMap.set(inf, [agentHost]);
          this._providerMap.set(inf, [providerProp]);
        }

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

    log('current agentSet: %O', this.agentSet);
    this._subscriber.onData(this.agentSet);
  }

  get agentSet() {
    const set = new Set();
    for (let agentList of this._agentMap.values()) {
      for (let agentHostPort of agentList) {
        set.add(agentHostPort);
      }
    }
    return set;
  }

  get providerMap() {
    return this._providerMap;
  }

  getAgentHostList(ctx: Context) {
    const {dubboInterface, version, group} = ctx;
    return (this._providerMap.get(dubboInterface) || [])
      .filter(providerProps => {
        const isSameVersion = providerProps.version === version;
        //如果Group不为null，确保group和接口的group一致
        //如果Group为null，就默认匹配， 不检查group
        const isSameGroup = group ? group === providerProps.group : true;

        return isSameGroup && isSameVersion;
      })
      .map(({host, port}) => `${host}:${port}`);
  }

  getProviderProps(ctx: Context) {
    let {dubboInterface, version, group, invokeHost, invokePort} = ctx;
    const providerList = this._providerMap.get(dubboInterface);
    for (let providerMeta of providerList) {
      const isSameHost = providerMeta.host === invokeHost;
      const isSamePort = providerMeta.port === invokePort;
      const isSameVersion = providerMeta.version === version;
      //如果Group不为null，确保group和接口的group一致
      //如果Group为null，就默认匹配， 不检查group
      const isSameGroup = group ? group === providerMeta.group : true;

      if (isSameHost && isSamePort && isSameVersion && isSameGroup) {
        log('getProviderProps=-> %O', providerMeta);
        return providerMeta;
      }
    }
  }

  subscribe(subscriber: IZookeeperSubscriber) {
    this._subscriber = subscriber;
    return this;
  }

  /**
   * 获取所有的provider列表
   * @param {string} providerPath
   * @param dubboInterface
   * @returns {Promise<Array<string>>}
   * @private
   */
  private async _getProviderList(
    providerPath: string,
    dubboInterface: string,
  ): Promise<Array<string>> {
    const {res, err} = await to(
      this._getChildren(
        providerPath,
        this._watch(providerPath, dubboInterface),
      ),
    );
    if (err) {
      log(`getChildren ${providerPath} error ${err}`);
      return [];
    }

    return res.children
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

  private _watch(providerPath: string, dubboInterface: string) {
    //@ts-ignore
    return async (e: zookeeper.Event) => {
      log(`trigger watch ${providerPath}, type: %s`, e.getName());
      const providers =
        (await this._getProviderList(providerPath, dubboInterface)) || [];
      const providerList = providers.map(ZkClient.parseUrl);
      log(
        'update dubboInterface % providerList %O',
        dubboInterface,
        providerList,
      );
      //update providerMap
      this.providerMap.set(dubboInterface, providerList);
      log(`update current providerMap-> %O`, this._providerMap);

      //当前的agentList
      const agentSet = providerList.map(
        ({host, port, dubboVersion, version}) => {
          this._createConsumer({
            host: host,
            port: port,
            name: this._props.application.name,
            dubboInterface: dubboInterface,
            dubboVersion: dubboVersion,
            version: version,
          }).then(() => log('create consumer finish'));
          return `${host}:${port}`;
        },
      );

      this._agentMap.set(dubboInterface, agentSet);
      log('current agentSet: %O', this.agentSet);
      this._subscriber.onData(this.agentSet);
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
        `consumer://${ip.address()}/${dubboInterface}?${qs.stringify(
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

  /**
   *
   * 解析dubbo的url，获取host，port，path
   *
   * @param dubboUrl dubbo的url
   *
   * 例如：
   * dubbo://192.168.2.1:38080/com.ofpay.demo.api.UserProvider?anyhost=true
   * &application=demo-provider&default.timeout=10000&dubbo=2.4.10
   * &environment=product&interface=com.ofpay.demo.api.UserProvider
   * &methods=getUser,queryAll,queryUser,isLimit&owner=wenwu&pid=61578&side=provider&timestamp=1428904600188
   */
  private static parseUrl(dubboUrl): IProviderProps {
    const rpcUrl = decodeURIComponent(dubboUrl);
    const rpc = url.parse(rpcUrl);
    const query = qs.parse(rpcUrl);

    return {
      host: rpc.hostname,
      port: parseInt(rpc.port),
      timeout: query.timeout ? parseInt(query.timeout as string) : 0,
      path: rpc.pathname.substring(1),
      dubboVersion: query.dubbo || '',
      version: query.version || '',
      group: query.group || '',
    } as any;
  }
}

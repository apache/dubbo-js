import * as url from 'url';
import * as qs from 'querystring';
import * as ip from 'ip';
import * as zookeeper from 'node-zookeeper-client';
import * as debug from 'debug';
import {IZkClientProps, IProviderProps} from './types';
import {to} from './to';

const log = debug('dubbo:zookeeper');
const noop = () => {};

export type TAgentHostPort = string;
export type TDubboInterface = string;

export class ZkClient {
  constructor(props: IZkClientProps) {
    log(`init props ${JSON.stringify(props, null, 2)}`);

    this._props = props;
    this._props.zkRoot = this._props.zkRoot || 'dubbo';
    this._isClientConnected = false;
    this._agentSet = new Set();
    this._providerMap = new Map();
    this._updateCB = noop;
  }

  private _props: IZkClientProps;
  private _client: zookeeper.Client;
  private _isClientConnected: boolean;
  private _updateCB: Function;
  private _agentSet: Set<TAgentHostPort>;
  private _providerMap: Map<TDubboInterface, {string: IProviderProps}>;

  static from(props: IZkClientProps) {
    return new ZkClient(props);
  }

  async getProviderAndAgentList(): Promise<Error | null> {
    const {zkRoot} = this._props;

    //等待连接zookeeper
    if (!this._isClientConnected) {
      const {err} = await to(this._connect());
      if (err) {
        log(`connect zk error ${err}`);
        this._isClientConnected = false;
        return err;
      }
    }

    //已经连上
    this._isClientConnected = true;

    const {interfaces} = this._props;
    if (typeof interfaces === 'undefined' || interfaces.length === 0) {
      log(`zk props could not find any interfaces`);
      return new Error(`zk props could not find any interfaces`);
    }

    const {application: {name}} = this._props;

    //获取所有provider
    for (let inf of interfaces) {
      const providerPath = `/${zkRoot}/${inf}/providers`;
      const providers = (await this._getProviderList(providerPath, inf)) || [];
      const providerMetaList = providers.map(ZkClient.parseUrl);

      for (let providerProp of providerMetaList) {
        const {host, port} = providerProp;
        const agentHost = `${host}:${port}`;
        this._agentSet.add(agentHost);

        if (this._providerMap.get(inf)) {
          this._providerMap.get(inf)[agentHost] = providerPath;
        } else {
          const obj = Object.create(null);
          obj[agentHost] = providerProp;
          this._providerMap.set(inf, obj);
        }

        //写入consume信息
        this._createConsumer(name, inf, providerProp.dubboVersion);
      }
    }
  }

  queryAgentKeybyInterface(dubboInterface: string) {
    return this._providerMap.get(dubboInterface);
  }

  get agentList() {
    return this._agentSet;
  }

  get providerMap() {
    return this._providerMap;
  }

  getAgentHostList(dubboInterface: string) {
    return Object.keys(this._providerMap.get(dubboInterface));
  }

  subscribe(cb: Function) {
    this._updateCB = cb;
    return this;
  }

  /**
   * connect zookeeper
   * @returns {Promise<Error>}
   */
  private _connect(): Promise<Error | null> {
    return new Promise((resolve, reject) => {
      const {register} = this._props;

      log(`conncecting zkserver ${register}`);
      this._client = zookeeper.createClient(register, {
        retries: 3,
        sessionTimeout: 10 * 1000,
      });

      //超时检测
      const {retries, sessionTimeout} = (this._client as any).options;
      const timeId = setTimeout(() => {
        log(`can not connect zk ${register}， time out`);
        this._client.close();
        reject(new Error('connect zkserver timeout'));
      }, retries * sessionTimeout);

      //connected
      this._client.once('connected', () => {
        log(`connected to zkserver ${register}`);
        clearTimeout(timeId);
        this._isClientConnected = true;
        resolve(null);
      });

      //the connection between client and server is dropped.
      this._client.once('disconnected', () => {
        log(`zk ${register} had disconnected`);
        this._isClientConnected = false;
        clearTimeout(timeId);
        reject(new Error('zkserver had disconnected'));
      });

      //The client session is expired
      this._client.once('expired', () => {
        this._isClientConnected = false;
        log(`zk ${register} had expired`);
        reject(new Error('zkserver had expired'));
      });

      //connect
      this._client.connect();
    });
  }

  /**
   * 获取所有的provider列表
   * @param {string} providerPath
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

  private _watch(providerPath: string, dubboInterface: string) {
    return async (e: zookeeper.Event) => {
      log(`trigger watch ${providerPath}`);

      const providers =
        (await this._getProviderList(providerPath, dubboInterface)) || [];

      const providerList = providers.map(ZkClient.parseUrl);
      const agentList = providerList.map(({host, port, dubboVersion}) => {
        this._createConsumer(
          this._props.application.name,
          dubboInterface,
          dubboVersion,
        );
        return `${host}:${port}`;
      });

      const addAgentSet = new Set();

      for (let provider of providerList) {
        const {host, port} = provider;
        const agentHost = `${host}:${port}`;

        //如果新增的负载
        if (!this._agentSet.has(agentHost)) {
          log('add new agent->', agentHost);

          addAgentSet.add(agentHost);
          this._agentSet.add(agentHost);

          if (this._providerMap.get(dubboInterface)) {
            this._providerMap.get(dubboInterface)[agentHost] = providerPath;
          } else {
            const obj = Object.create(null);
            obj[agentHost] = provider;
            this._providerMap.set(dubboInterface, obj);
          }
        }
      }

      //delete list
      for (let agentHost of this._agentSet) {
        if (agentList.indexOf(agentHost) === -1) {
          //delete
          log('delete->', agentHost);
          this._agentSet.delete(agentHost);
          const providerMap = this._providerMap.get(dubboInterface);
          if (providerMap) {
            delete providerMap[agentHost];
          }
        }
      }

      log('add agent->');
      log(addAgentSet);
      log(`providerMap->`);
      log(this._providerMap);
      log('agentSet->');
      log(this._agentSet);

      if (addAgentSet.size !== 0) {
        this._updateCB(addAgentSet);
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

  private async _createConsumer(
    name: string,
    dubboInterface: string,
    dubboVersion: string,
  ) {
    const queryParams = {
      interface: dubboInterface,
      application: name,
      category: 'consumer',
      dubbo: dubboVersion,
      method: '',
      revision: '',
      version: '',
      side: 'consumer',
      check: 'false',
      timestamp: new Date().getTime(),
    };

    const consumerRoot = `/dubbo/${dubboInterface}/consumers`;
    const err = await this._createRootConsumer(consumerRoot);
    if (err) {
      log(err);
    }

    const consumerUrl =
      consumerRoot +
      '/' +
      encodeURIComponent(
        `consumer://${ip.address()}/${dubboInterface}?${encodeURIComponent(
          qs.stringify(queryParams),
        )}`,
      );
    log(`check consumer url: ${consumerUrl}`);
    const exisits = await to(this._exists(consumerUrl));
    if (exisits.err || exisits.res) {
      log('创建consumer失败或者consumer已经存在');
      return;
    }

    const create = await to(
      this._create(consumerUrl, zookeeper.CreateMode.EPHEMERAL),
    );

    if (create.err) {
      log('创建consumer失败');
      return;
    }
    log(`create successfully consumer url: ${consumerUrl}`);
  }

  private async _createRootConsumer(consumer: string) {
    const {res, err} = await to(this._exists(consumer));
    if (err) {
      log(`consumer exisit ${consumer}`);
      log(err);
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
      dubboVersion: query.dubbo || '',
      version: query.version || '',
      group: query.group || '',
    } as any;
  }
}

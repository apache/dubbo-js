import * as debug from 'debug';
import SocketPool from './socket-pool';
import {TAgentHostPort} from './zookeeper';

const noop = () => {};
const log = debug('dubbo:socket-agent');

export interface ISocketAgentProps {
  agentHostList: Set<string>;
}

export default class SocketAgent {
  constructor(props: ISocketAgentProps) {
    this._props = props;
    this._onConnect = noop;
    this._onData = noop;
    this._onClose = noop;
    this._socketAgentMap = new Map();

    log('new SocketAgent');

    const {agentHostList} = this._props;
    this._initSocketPool(agentHostList);
  }

  private _props: ISocketAgentProps;
  private _socketAgentMap: Map<TAgentHostPort, SocketPool>;
  private _onConnect: Function;
  private _onData: Function;
  private _onClose: Function;

  static from(agentHostList: Set<string>) {
    return new SocketAgent({agentHostList});
  }

  addMoreAgent(agentHostList: Set<string>) {
    this._initSocketPool(agentHostList);
    return this;
  }

  private _initSocketPool = (agentHostList: Set<string>) => {
    //获取负载host:port列表
    //根据负载创建连接池
    process.nextTick(() => {
      for (let agentHost of agentHostList) {
        log(`new SocketAgent with ${agentHost} -> socket pool`);
        const socketPool = SocketPool.from(agentHost)
          .onConnect(this._onConnect)
          .onData(this._onData)
          .onClose(this._onClose);

        this._socketAgentMap.set(agentHost, socketPool);
      }
    });
  };

  /**
   * 查询一组负载可用的agent
   * @param agentHostPorts
   */
  getAvaliableSocketAgents(
    agentHostPorts: Array<TAgentHostPort>,
  ): Array<SocketPool> {
    let avaliableList = [];
    agentHostPorts.forEach(agentHostPort => {
      const socketPool = this._socketAgentMap.get(agentHostPort);
      if (socketPool && socketPool.hasAvaliableNodes) {
        avaliableList.push(socketPool);
      }
    });
    return avaliableList;
  }

  getAvaliableSocketAgent(agentHostPorts: Array<TAgentHostPort>) {
    const avaliableList = this.getAvaliableSocketAgents(agentHostPorts);
    const len = avaliableList.length;
    if (len === 1) {
      return avaliableList[0];
    }

    return avaliableList[Math.floor(Math.random() * len)];
  }

  hasAvaliableSocketAgent(agentHostPorts: Array<TAgentHostPort>) {
    return this.getAvaliableSocketAgents(agentHostPorts).length > 0;
  }

  onConnect = (cb: Function) => {
    this._onConnect = cb;
    return this;
  };

  onData = (cb: Function) => {
    this._onData = cb;
    return this;
  };

  onClose = (cb: Function) => {
    this._onClose = cb;
    return this;
  };

  clearClosedPool = () => {
    for (let [agentHost, socketPool] of this._socketAgentMap) {
      if (socketPool.isAllClose) {
        //如果全部关闭
        log(`${agentHost}'s pool socket-worker had all closed.`);
        this._socketAgentMap.delete(agentHost);
      }
    }
  };
}

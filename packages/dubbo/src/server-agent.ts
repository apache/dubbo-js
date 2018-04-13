import debug from 'debug';
import SocketPool from './socket-pool';
import {TAgentHostPort} from './zookeeper';
import {ISocketSubscriber, IObservable} from './types';
import {msg, MSG_TYPE} from './msg';
import {SocketError} from './err';

const noop = () => {};
const log = debug('dubbo:server-agent');

/**
 * 机器agent和socket-pool的管理容器
 */
export class ServerAgent implements IObservable<ISocketSubscriber> {
  constructor() {
    log('new ServerAgent');
    this._agentHostSet = new Set();
    this._serverAgentMap = new Map();
    this._subscriber = {
      onConnect: noop,
      onData: noop,
      onClose: noop,
    };
  }

  private _agentHostSet: Set<string>;
  private _subscriber: ISocketSubscriber;
  private readonly _serverAgentMap: Map<TAgentHostPort, SocketPool>;

  from = (agentHostList: Set<string>) => {
    //获取负载host:port列表
    //根据负载创建连接池
    process.nextTick(() => {
      for (let agentHost of agentHostList) {
        if (this._agentHostSet.has(agentHost)) {
          continue;
        }
        log(`new ServerAgent with ${agentHost} -> socket pool`);
        const socketPool = SocketPool.from(agentHost).subscribe({
          onConnect: this._subscriber.onConnect,
          onData: this._subscriber.onData,
          onClose: ({pid}) => {
            this.clearClosedPool();
            this._subscriber.onClose({pid});
          },
        });
        this._serverAgentMap.set(agentHost, socketPool);
      }
      log(
        'current ServerAgent includes agentHosts: %O',
        this._serverAgentMap.keys(),
      );
    });

    return this;
  };

  /**
   * 查询一组负载可用的agent
   * @param agentHostPorts
   */
  getAvailableSocketAgents(
    agentHostPorts: Array<TAgentHostPort>,
  ): Array<SocketPool> {
    let availableList = [];
    agentHostPorts.forEach(agentHostPort => {
      const socketPool = this._serverAgentMap.get(agentHostPort);
      if (socketPool && socketPool.hasAvaliableNodes) {
        availableList.push(socketPool);
      }
    });
    return availableList;
  }

  getAvailableSocketAgent(agentHostPorts: Array<TAgentHostPort>) {
    const availableList = this.getAvailableSocketAgents(agentHostPorts);
    const len = availableList.length;
    if (len === 1) {
      return availableList[0];
    }

    return availableList[Math.floor(Math.random() * len)];
  }

  hasAvailableSocketAgent(agentHostPorts: Array<TAgentHostPort>) {
    return this.getAvailableSocketAgents(agentHostPorts).length > 0;
  }

  clearClosedPool = () => {
    for (let [agentHost, socketPool] of this._serverAgentMap) {
      if (socketPool.isAllClose) {
        //如果全部关闭
        log(
          `${agentHost}'s pool socket-worker had all closed. delete ${agentHost}`,
        );

        //通知外部，销毁了这个socket-pool
        msg.emit(
          MSG_TYPE.SYS_ERR,
          new SocketError(
            `${agentHost}'s pool socket-worker had all closed. delete ${agentHost}`,
          ),
        );

        this._serverAgentMap.delete(agentHost);
      }
    }
    log('SocketAgent current agentHost->', this._serverAgentMap.keys());
  };

  subscribe(subscriber: ISocketSubscriber) {
    this._subscriber = subscriber;
    return this;
  }
}

export default new ServerAgent();

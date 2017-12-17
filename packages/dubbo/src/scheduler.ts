import * as debug from 'debug';
import queue from './queue';
import {ZkClient} from './zookeeper';
import {IZkClientProps} from './types';
import SocketAgent from './socket-agent';

const log = debug('dubbo:scheduler');

enum SCHEDULE_STATUS {
  PADDING,
  FAILED,
  READY,
}

export default class Scheduler {
  constructor(props: IZkClientProps) {
    log(`new Scheduler, with ${JSON.stringify(props, null, 2)}`);
    //subscribe invoke queue
    queue.subscribe(this._handleQueueSubscribe);

    this._init(props).catch(err => {
      log(`init failed.`);
      log(err);
      //TODO 告警
    });
  }

  private _status: number;
  private _zkClient: ZkClient;
  private _socketAgent: SocketAgent;

  static from(props) {
    return new Scheduler(props);
  }

  private async _init(props) {
    this._status = SCHEDULE_STATUS.PADDING;

    //创建zk
    this._zkClient = ZkClient.from(props).subscribe(this._subscribeZkUpdate);

    //获取provider信息
    const err = await this._zkClient.getProviderAndAgentList();
    if (err) {
      log(err);
      //所有的queue中的全做失败处理
      queue.allFailed(err);
      this._status = SCHEDULE_STATUS.FAILED;
      return err;
    }

    const agentList = this._zkClient.agentList;
    log(`get agent list:=>`);
    log(agentList);

    const providerMap = this._zkClient.providerMap;
    log(`get providerMap =>`);
    log(providerMap);
    //如果负载为空，也就是没有任何provider提供服务
    if (agentList.size === 0) {
      //所有的queue中的全做失败处理
      queue.allFailed(new Error('Can not find any agent'));
      this._status = SCHEDULE_STATUS.FAILED;
      return;
    }

    log(`dubbo agent number: ${agentList.size}`);
    this._socketAgent = SocketAgent.from(agentList)
      .onConnect(this._onConnect)
      .onData(this._onData)
      .onClose(this._onClose);
    this._status = SCHEDULE_STATUS.READY;
  }

  private _subscribeZkUpdate = (addAgentSet: Set<string>) => {
    log(`subcribe=> add dubbo agent number: ${addAgentSet.size}`);
    if (!this._socketAgent) {
      log('create new socketAgent');
      this._socketAgent = SocketAgent.from(addAgentSet)
        .onConnect(this._onConnect)
        .onData(this._onData)
        .onClose(this._onClose);
    } else {
      log('add more socketAgent');
      this._socketAgent.addMoreAgent(addAgentSet);
    }
    this._status = SCHEDULE_STATUS.READY;
  };

  private _handleQueueSubscribe = requestId => {
    log(
      `handle requestId ${requestId}, status: ${SCHEDULE_STATUS[this._status]}`,
    );
    switch (this._status) {
      case SCHEDULE_STATUS.PADDING:
        log('scheduler was padding');
        break;
      case SCHEDULE_STATUS.FAILED:
        log('scheduler was failed');
        queue.failed(
          requestId,
          new Error('Schedule error, Zk Could not connect'),
        );
        break;
      case SCHEDULE_STATUS.READY:
        log('scheduler was ready');
        const dubboInterface = queue.getInterface(requestId);
        const agentHostList = this._zkClient.getAgentHostList(dubboInterface);
        log('agentHostList->', agentHostList);
        //如果没有提供者
        if (agentHostList.length === 0) {
          queue.failed(
            requestId,
            new Error(`Could not find any ${dubboInterface} providers`),
          );
        } else {
          if (this._socketAgent.hasAvaliableSocketAgent(agentHostList)) {
            const socketPool = this._socketAgent.getAvaliableSocketAgent(
              agentHostList,
            );
            const node = socketPool.worker;
            const providers = this._zkClient.providerMap.get(dubboInterface);

            queue.consume(
              requestId,
              node,
              providers[`${node.host}:${node.port}`],
            );
          }
        }
        break;
      default:
        break;
    }
  };

  private _onConnect = ({pid, host, port}) => {
    log(`scheduler receive SocketWorker connect pid#${pid} ${host}:${port}`);
    const agentHost = `${host}:${port}`;
    const {scheduleQueue} = queue;

    for (let requestId of scheduleQueue.keys()) {
      if (queue.isNotSchedule(requestId)) {
        const dubboInterface = queue.getInterface(requestId);
        const agentHostList = this._zkClient.getAgentHostList(dubboInterface);
        if (agentHostList.indexOf(agentHost) != -1) {
          const node = this._socketAgent.getAvaliableSocketAgent(agentHostList)
            .worker;
          log(`SocketWorker#${node.pid} =invoked=> ${requestId}`);
          const providers = this._zkClient.providerMap.get(dubboInterface);
          queue.consume(
            requestId,
            node,
            providers[`${node.host}:${node.port}`],
          );
        }
      }
    }
  };

  /**
   * 当收到数据的时候
   */
  private _onData = ({requestId, res, err}) => {
    if (err) {
      queue.failed(requestId, err);
    } else {
      queue.resolve(requestId, res);
    }
  };

  private _onClose = ({pid}) => {
    log(`SocketWorker#${pid} was close`);
    this._socketAgent.clearClosedPool();

    //查询之前哪些接口的方法被pid调用
    const {invokeQueue, scheduleQueue} = queue;
    if (invokeQueue.size == 0) {
      log(`current invoke-queue is empty`);
      return;
    }

    for (let [requestId, _pid] of scheduleQueue) {
      if (_pid === pid) {
        queue.failed(requestId, new Error(`SocketWorker#${pid} had closed.`));
      }
    }
  };
}

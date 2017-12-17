import * as debug from 'debug';
import {
  TRequestId,
  IQueueProps,
  IDubboEncoderProps,
  IProviderProps,
} from './types';
import SocketWorker from './socket-worker';

const log = debug('dubbo:queue');
const NONE_PID = -1;
const noop = () => {};

type TSocketNodePID = number;

/**
 * 将Dubbo调用的服务放入队列中
 */
export class Queue {
  constructor() {
    log('new Queue');
    //调用队列-保持调用的requestId和参数
    this._invokeQueue = new Map();
    //调度队列-保持requestId和socketWorker pid
    this._scheduleQueue = new Map();
    //订阅者
    this._subscriber = noop;
  }

  private _scheduleQueue: Map<TRequestId, TSocketNodePID>;
  private _invokeQueue: Map<TRequestId, IQueueProps>;
  private _subscriber: Function;

  static create() {
    return new Queue();
  }

  add = (requestId: TRequestId, params: {args: IDubboEncoderProps}) => {
    return new Promise((resolve, reject) => {
      params['resolve'] = resolve;
      params['reject'] = reject;
      const {args: {dubboInterface}} = params;

      log(`add queue,${requestId}, interface: ${dubboInterface}`);

      //设置调用队列
      this._invokeQueue.set(requestId, params as any);
      //设置调度队列
      this._scheduleQueue.set(requestId, NONE_PID);

      log(`current schedule queue`);
      log(this._scheduleQueue);

      //通知scheduler
      this._subscriber(requestId, params);
    });
  };

  get invokeQueue() {
    return this._invokeQueue;
  }

  get scheduleQueue() {
    return this._scheduleQueue;
  }

  subscribe(cb: Function) {
    this._subscriber = cb;
    return this;
  }

  getInterface(requestId: TRequestId) {
    const {args: {dubboInterface}} = this._invokeQueue.get(requestId);
    return dubboInterface;
  }

  getSocketNodeId(requestId: TRequestId) {
    return this._scheduleQueue.get(requestId);
  }

  isNotSchedule(requestId: TRequestId) {
    return this.getSocketNodeId(requestId) === NONE_PID;
  }

  clear(requestIds) {
    for (let requestId of requestIds) {
      log(`clear invoke and schedule queue #${requestId}`);
      this._invokeQueue.delete(requestId);
      this._scheduleQueue.delete(requestId);
    }
    log(`current schedule queue`);
    log(this._scheduleQueue);
  }

  allFailed(err: Error) {
    for (let requestId of this._invokeQueue.keys()) {
      log(`schedule failed queue # ${requestId}`);
      const {reject} = this._invokeQueue.get(requestId);
      reject(err);
    }
    this.clear(this._invokeQueue.keys());
  }

  failed(requestId: TRequestId, err: Error) {
    const {reject} = this._invokeQueue.get(requestId);
    log(`staring schedule ${requestId}, reject`);
    log(err);
    reject(err);
    this.clear([requestId]);
  }

  consume(
    requestId: TRequestId,
    node: SocketWorker,
    providerMeta: IProviderProps,
  ) {
    const {args} = this._invokeQueue.get(requestId);
    const {dubboInterface} = args;
    log(`staring schedule ${requestId}#${dubboInterface}`);

    //merge dubboVersion timeout group
    args.dubboVersion = args.dubboVersion || providerMeta.dubboVersion;
    args.timeout = args.timeout || providerMeta.timeout;
    args.group = args.group || providerMeta.group;

    node.write(args);
    this._scheduleQueue.set(requestId, node.pid);

    log(`current schedule queue`);
    log(this._scheduleQueue);
  }

  resolve(requestId, res) {
    //如果已经被clear
    if (!this._invokeQueue.has(requestId)) {
      return;
    }
    const {resolve} = this._invokeQueue.get(requestId);
    resolve(res);

    this.clear([requestId]);
  }
}

export default Queue.create();

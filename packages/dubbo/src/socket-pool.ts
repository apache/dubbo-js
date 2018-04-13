import debug from 'debug';
import SocketNode from './socket-worker';
import {SOCKET_STATUS} from './socket-status';
import SocketWorker from './socket-worker';
import config from './config';
import {IObservable, ISocketSubscriber} from './types';

const noop = () => {};
const log = debug('dubbo:socket-pool');

/**
 * Socket池容器，默认初始化4个socket
 */
export default class SocketPool implements IObservable<ISocketSubscriber> {
  constructor(props: {url: string; poolSize: number}) {
    log(`new SocketPool with ${JSON.stringify(props, null, 2)}`);

    this._socketPool = [];
    this._isInitEnd = false;

    this._url = props.url;
    this._poolSize =
      props.poolSize < 0 ? config.dubboSocketPool : props.poolSize;

    this._subscriber = {
      onConnect: noop,
      onData: noop,
      onClose: noop,
    };

    process.nextTick(() => {
      this._init();
    });
  }

  private _url: string;
  private readonly _poolSize: number;
  private _isInitEnd: boolean;
  private _socketPool: Array<SocketNode>;
  private _subscriber: ISocketSubscriber;

  static from(url: string, poolSize: number = config.dubboSocketPool) {
    return new SocketPool({
      url,
      poolSize,
    });
  }

  private _init = () => {
    for (let i = 0; i < this._poolSize; i++) {
      this._socketPool.push(
        SocketWorker.from(this._url).subscribe(this._subscriber),
      );
    }

    this._isInitEnd = true;
  };

  get isAllClose() {
    return (
      this._isInitEnd &&
      this._socketPool.every(worker => worker.status === SOCKET_STATUS.CLOSED)
    );
  }

  get hasAvaliableNodes() {
    return this._isInitEnd && this.availableWorkers.length > 0;
  }

  get availableWorkers() {
    return this._socketPool.filter(
      worker => worker.status === SOCKET_STATUS.CONNECTED,
    );
  }

  get worker() {
    const worker = this.availableWorkers;
    const len = worker.length;

    if (len === 1) {
      return worker[0];
    }

    return worker[Math.floor(Math.random() * worker.length)];
  }

  subscribe(subscriber: ISocketSubscriber) {
    this._subscriber = subscriber;
    return this;
  }
}

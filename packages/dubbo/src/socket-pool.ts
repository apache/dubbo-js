import * as debug from 'debug';
import SocketNode from './socket-worker';
import {SOCKET_STATUS} from './socket-status';
import SocketWorker from './socket-worker';

const MAX_POOL_SIZE = 4;
const noop = () => {};
const log = debug('dubbo:socket-pool');

export default class SocketPool {
  constructor(props: {url: string; poolSize: number}) {
    log(`new SocketPool with ${JSON.stringify(props, null, 2)}`);
    this._socketPool = [];
    this._isInitEnd = false;

    this._url = props.url;
    this._poolSize = props.poolSize < 0 ? MAX_POOL_SIZE : props.poolSize;

    this._onConnect = noop;
    this._onClose = noop;
    this._onData = noop;

    process.nextTick(() => {
      this._init();
    });
  }

  private _url: string;
  private _poolSize: number;
  private _isInitEnd: boolean;
  private _socketPool: Array<SocketNode>;
  private _onConnect: Function;
  private _onClose: Function;
  private _onData: Function;

  static from(url: string, poolSize: number = MAX_POOL_SIZE) {
    return new SocketPool({
      url,
      poolSize,
    });
  }

  private _init = () => {
    for (let i = 0; i < this._poolSize; i++) {
      this._socketPool.push(
        SocketWorker.from(this._url)
          .onConnect(this._onConnect)
          .onData(this._onData)
          .onClose(this._onClose),
      );
    }

    this._isInitEnd = true;
  };

  onConnect(cb: Function) {
    this._onConnect = cb;
    return this;
  }

  onData(cb: Function) {
    this._onData = cb;
    return this;
  }

  onClose(cb: Function) {
    this._onClose = cb;
    return this;
  }

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
}

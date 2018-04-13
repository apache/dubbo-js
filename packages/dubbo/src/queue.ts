import debug from 'debug';
import config from './config';
import Context from './context';
import SocketWorker from './socket-worker';
import statistics from './statistics';
import {IProviderProps, TRequestId, IObservable} from './types';
import {DubboMethodParamHessianTypeError, DubboTimeoutError} from './err';
import {msg, MSG_TYPE} from './msg';

const log = debug('dubbo:queue');
const noop = () => {};

export type TQueueObserver = Function;

/**
 * Node的异步特性就会让我们在思考问题的时候，要转换一下思考问题的思维
 * 无论是zookeeper的连接，还是socket的创建都是异步的特性。
 * 但是请求的incoming的时候，整体可能还没有初始化结束，如果我们试图去阻塞
 * 就会导致整个编程架构很痛苦。
 * 所有简单的处理就是，每次处理请求incoming的时候先把请求参数推入队列，然后
 * 等待后面的资源初始化结束进行处理，如果超过超时时间就自动进行timeout超时处理
 */
export class Queue implements IObservable<TQueueObserver> {
  private constructor() {
    log('new Queue');
    //调用队列-保持调用的requestId和参数
    this._requestQueue = new Map();
    //订阅者,当有新的dubbo请求添加到队列中，通知schedule进行处理
    this._subscriber = noop;
  }

  //订阅者
  private _subscriber: Function;
  //请求队列
  private readonly _requestQueue: Map<TRequestId, Context>;

  static create() {
    return new Queue();
  }

  add = (ctx: Context) => {
    return new Promise((resolve, reject) => {
      ctx.resolve = resolve;
      ctx.reject = reject;

      //hessian参数检测
      if (!Queue._checkMethodArgsHessianType(ctx)) {
        return;
      }
      //timeout超时检测
      this._checkTimeout(ctx);
      //add queue
      const {requestId, dubboInterface} = ctx.request;
      log(`add queue,requestId#${requestId}, interface: ${dubboInterface}`);
      //设置调用队列
      this._requestQueue.set(requestId, ctx);
      log(`current schedule queue =>`, this.scheduleQueue);
      //通知scheduler
      this._subscriber(requestId, ctx);
    });
  };

  /**
   * 获取当前请求队列
   */
  get requestQueue() {
    return this._requestQueue;
  }

  /**
   * 获取当前调度队列
   */
  get scheduleQueue() {
    const schedule = {};
    for (let [requestId, ctx] of this._requestQueue) {
      schedule[requestId] = ctx.pid;
    }
    return schedule;
  }

  subscribe(cb: Function) {
    this._subscriber = cb;
    return this;
  }

  private _clear(requestId) {
    log(`clear invoke and schedule queue #${requestId}`);
    this._requestQueue.delete(requestId);
    log('current schedule queue', this.scheduleQueue);
    this._showStatistics();
  }

  allFailed(err: Error) {
    for (let [requestId, ctx] of this._requestQueue) {
      const {reject, request: {dubboInterface, methodName}} = ctx;
      log(
        'queue schedule failed requestId#%d, %s#%s err: %s',
        requestId,
        dubboInterface,
        methodName,
        err,
      );
      ctx.cleanTimeout();
      reject(err);
    }
    this._requestQueue.clear();
  }

  failed(requestId: TRequestId, err: Error) {
    const ctx = this._requestQueue.get(requestId);
    if (!ctx) {
      return;
    }

    const {request: {dubboInterface, methodName}} = ctx;
    log('queue schedule failed requestId#%d, err: %s', requestId, err);
    err.message = `invoke ${dubboInterface}#${methodName} was error, ${
      err.message
    }`;
    //删除该属性，不然会导致JSON.Stringify失败
    if (err['cause']) {
      delete err['cause']['cause'];
    }
    ctx.cleanTimeout();
    ctx.reject(err);
    this._clear(requestId);
  }

  consume(
    requestId: TRequestId,
    node: SocketWorker,
    providerMeta: IProviderProps,
  ) {
    const ctx = this._requestQueue.get(requestId);
    if (!ctx) {
      return;
    }
    const {request} = ctx;
    const {dubboInterface, version} = request;
    log(`staring schedule ${requestId}#${dubboInterface}#${version}`);

    //merge dubboVersion timeout group
    request.dubboVersion = request.dubboVersion || providerMeta.dubboVersion;
    request.timeout = request.timeout || providerMeta.timeout;
    request.group = request.group || providerMeta.group;
    request.path = providerMeta.path;
    node.write(ctx);
    log(`current schedule queue ==>`, this.scheduleQueue);
  }

  resolve(requestId, res) {
    const ctx = this._requestQueue.get(requestId);
    if (!ctx) {
      return;
    }
    log('resolve requestId#%d, res: %O', requestId, res);
    ctx.cleanTimeout();
    ctx.resolve(res);
    this._clear(requestId);
  }

  private _showStatistics() {
    //调度完成,显示调度结果
    if (this._requestQueue.size === 0) {
      log('invoke statistics==>%o', statistics);
      //通知外部
      msg.emit(MSG_TYPE.SYS_STATISTICS, statistics);
    }
  }

  /**
   * 检测方法参数是不是都是hessian格式
   * @param ctx
   */
  private static _checkMethodArgsHessianType(ctx: Context) {
    if (ctx.isMethodArgsHessianType) {
      return true;
    }

    const {dubboInterface, methodArgs, methodName} = ctx.request;
    statistics.paramCheckErrCount++;

    log(
      `${dubboInterface} method: ${methodName} not all arguments are valid hessian type arguments: => %O`,
      methodArgs,
    );

    ctx.reject(
      new DubboMethodParamHessianTypeError(
        `err: ${dubboInterface}#${methodName} not all arguments are valid hessian type`,
      ),
    );

    return false;
  }

  /**
   * 超时检测
   * @param ctx
   */
  private _checkTimeout(ctx: Context) {
    const timeout = config.dubboInvokeTimeout * 1000;
    ctx.timeoutId = setTimeout(() => {
      statistics.timeoutErrCount++;
      const {requestId, dubboInterface, methodName} = ctx.request;

      log('timeout->', timeout);
      log(`err: ${dubboInterface}#${methodName} remote invoke timeout`);

      this.failed(
        requestId,
        new DubboTimeoutError(
          `err:${dubboInterface}#${methodName} remote invoke timeout`,
        ),
      );
    }, timeout);
  }
}

export default Queue.create();

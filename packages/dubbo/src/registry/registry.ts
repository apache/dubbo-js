import Context from '../context';
import DubboUrl from '../dubbo-url';
import {IRegistrySubscriber} from '../types';
import {noop} from '../util';

export type TAgentAddr = string;
export type TDubboInterface = string;

/**
 * 抽取注册中心的基类
 */
export default class Registry<T = {}> {
  protected _props: T;
  protected _subscriber: IRegistrySubscriber;
  protected readonly _dubboServiceUrlMap: Map<TDubboInterface, Array<DubboUrl>>;

  constructor(props: T) {
    this._props = props;

    //保存dubbo接口和服务url之间的映射关系
    this._dubboServiceUrlMap = new Map();

    //初始化订阅者
    this._subscriber = {
      onData: noop,
      onError: noop,
    };
  }

  /**
   * 订阅者
   * @param subscriber
   */
  subscribe(subscriber: IRegistrySubscriber) {
    this._subscriber = subscriber;
    return this;
  }

  /**
   * 获取可以处理上下文context中的dubbo接口信息map
   * @param ctx
   */
  getAgentAddrMap(ctx: Context): {[name: string]: DubboUrl} {
    const {dubboInterface, version, group} = ctx;
    return this._dubboServiceUrlMap
      .get(dubboInterface)
      .filter(serviceProp => {
        // "*" refer to default wildcard in dubbo
        const isSameVersion =
          !version || version == '*' || serviceProp.version === version;
        //如果Group为null，就默认匹配， 不检查group
        //如果Group不为null，确保group和接口的group一致
        const isSameGroup = !group || group === serviceProp.group;
        return isSameGroup && isSameVersion;
      })
      .reduce((reducer: Object, prop: DubboUrl) => {
        const {host, port} = prop;
        reducer[`${host}:${port}`] = prop;
        return reducer;
      }, Object.create(null));
  }
}

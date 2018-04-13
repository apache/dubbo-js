export interface IObservable<T> {
  subscribe(subscriber: T);
}

export type TDecodeBuffSubscriber = (data: Buffer) => void;

export interface IDubboSubscriber {
  onReady: () => void;
  onSysError: (err: Error) => void;
  onStatistics: (statInfo) => void;
}

export interface IZookeeperSubscriber {
  onData: Function;
  onError: Function;
}

export interface ISocketSubscriber {
  onConnect: Function;
  onData: Function;
  onClose: Function;
}

export interface ISocketAgentProps {
  agentHostList: Set<string>;
}

export interface IDirectlyDubboProps {
  dubboAddress: string;
  dubboVersion: string;
  dubboInvokeTimeout?: number;
}

export interface IInvokeParam {
  dubboInterface: string;
  version: string;
  methods: {[methodName: string]: Function};
  timeout?: number;
  group?: string;
}
export interface IDubboProps {
  dubboVersion: string;
  application?: {name: string};
  enableHeartBeat?: boolean;
  /**
   * 单位为秒
   */
  dubboInvokeTimeout?: number;
  dubboSocketPool?: number;
  register: string;
  zkRoot?: string;
  interfaces: Array<string>;
}
export interface IDubboResult<T> {
  err: Error;
  res: T;
}

export type TDubboCallResult<T> = Promise<IDubboResult<T>>;

export interface IDubboProvider {
  dubboInterface: string;
  version?: string;
  timeout?: number;
  group?: string;
  methods: {[methodName: string]: Function};
}

export interface IZkClientProps {
  application?: {name: string};
  zkRoot?: string;
  register: string;
  interfaces: Array<string>;
}

export interface IProviderProps {
  host: string;
  port: number;
  path: string;
  dubboVersion: string;
  version: string;
  group: string;
  timeout: number;
}
export type TRequestId = number;

export interface IDubboResponse<T> {
  requestId: number;
  err: Error | null;
  res: T | null;
}

export interface IHessianType {
  $class: string;
  $: any;
}

export type Middleware<T> = (context: T, next: () => Promise<any>) => any;

export interface IContextRequestParam {
  requestId: number;
  dubboVersion: string;
  dubboInterface: string;
  path: string;
  methodName: string;
  methodArgs: Array<IHessianType>;
  version: string;
  timeout: number;
  group: string;
}

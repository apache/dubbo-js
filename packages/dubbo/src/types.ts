export interface IDubboProps {
  application?: {name: string};
  dubboVersion: string;
  enableHeartBeat?: boolean;
  register?: string;
  zkRoot?: string;
  interfaces: Array<string>;
}

export interface IDubboEncoderProps {
  requestId: number;
  dubboVersion: string;
  dubboInterface: string;
  methodName: string;
  methodArgs: any;
  version?: string;
  timeout?: number;
  group?: string;
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
  port: string;
  dubboVersion: string;
  version: string;
  group: string;
  timeout: number;
}

export interface IQueueProps {
  resolve: (param: any) => void;
  reject: (err: Error) => void;
  args: IDubboEncoderProps;
}

export type TRequestId = number;

export interface IDubboRespose<T> {
  requestId: number;
  err: Error | null;
  res: T | null;
}

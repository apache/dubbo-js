/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import Registry from './registry/registry';
import {Setting} from './setting';

export type THostPort = string;
export type TAgentAddr = string;
export type TDubboInterface = string;

/**
 * dubbo对象透传给registry的类型
 */
export interface IDubboRegistryProps {
  application?: {name: string};
  interfaces: Array<string>;
  dubboSetting: Setting;
}

export interface IRegistrySubscriber {
  onData: (agentSet: Set<THostPort>) => void;
  onError: (err: Error) => void;
}

export interface IObservable<T> {
  subscribe(subscriber: T): this;
}

export type TDecodeBuffSubscriber = (data: Buffer) => void;

export interface ITrace {
  type: 'INFO' | 'ERR';
  msg: string | Error;
  pid?: string;
  host?: string;
  time?: string;
}

export interface IDubboSubscriber {
  onTrace: (msg: ITrace) => void;
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
  methods: {[methodName: string]: Function};
  group?: string;
  version?: string;
  timeout?: number;
}

export interface IDubboProps {
  //当前的应用标识
  application: {name: string};
  register: ((props: IDubboRegistryProps) => Registry) | string;
  //当前要注册到dubbo容器的服务对象
  service: Object;
  isSupportedDubbox?: boolean;
  //dubbo调用最大超时时间单位为秒，默认5s
  dubboInvokeTimeout?: number;
  //dubbo为每个server-agent创建的socketpool数量，默认1
  dubboSocketPool?: number;
  dubboSetting: Setting;
}

//magic, you should use typescript 2.8+
export type TDubboService<T> = {
  [k in keyof T]: T[k] extends ((dubbo: any) => infer R) ? R : any
};

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

// zookeeper acl shemes must be one of [ 'world', 'ip', 'host', 'auth', 'digest' ]
export type IZKAuthSchemes = 'world' | 'ip' | 'host' | 'auth' | 'digest';

export interface IZKAuthInfo {
  scheme: IZKAuthSchemes;
  auth: string;
}

export interface IZkClientProps {
  zkAuthInfo?: IZKAuthInfo;
  zkRoot?: string;
  url: string;
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
  attachments: Object;
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

export interface IQueryObj {
  application: string;
  dubbo: string;
  interface: string;
  path: string;
  methods: string;
  version: string;
  group: string;
  //
  category: string;
  dynamic: string;
  enabled: string;
  weight: string;
}

export type TQueueObserver = Function;

export interface ICreateConsumerParam {
  name: string;
  dubboInterface: string;
}

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
import {Setting} from './setting';

export interface IObservable<T> {
  subscribe(subscriber: T);
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

export interface IRegistrySubscriber {
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
  methods: {[methodName: string]: Function};
  group?: string;
  version?: string;
  timeout?: number;
}

export interface IDubboProps {
  //当前的应用标识
  application: {name: string};
  //zookeeper注册中心地址
  register: string;
  isSupportedDubbox?: boolean;
  //dubbo调用最大超时时间单位为秒，默认5s
  dubboInvokeTimeout?: number;
  //dubbo为每个server-agent创建的socketpool数量，默认4
  dubboSocketPool?: number;
  //zookeeper的根目录，默认/root
  zkRoot?: string;
  //当前要注册到dubbo容器的服务对象
  service: Object;
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

export interface IZkClientProps {
  application?: {name: string};
  zkRoot?: string;
  register: string;
  interfaces: Array<string>;
  dubboSetting: Setting;
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
}

export type TQueueObserver = Function;

export interface ICreateConsumerParam {
  name: string;
  dubboInterface: string;
}

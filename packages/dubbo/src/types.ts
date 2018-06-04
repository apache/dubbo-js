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
export interface IObservable<T> {
  subscribe(subscriber: T);
}

export type TDecodeBuffSubscriber = (data: Buffer) => void;

export interface IDubboSubscriber {
  onReady?: () => void;
  onSysError?: (err: Error) => void;
  onStatistics?: (statInfo) => void;
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
  methods: {[methodName: string]: Function};
  group?: string;
  version?: string;
  timeout?: number;
}
export interface IDubboProps {
  isSupportedDubbox?: boolean;
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

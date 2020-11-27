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

import debug from 'debug';
import {id} from './request-id';
import {IContextRequestParam, IDubboResult, IHessianType} from '../types';
import {checkHessianParam} from '../common/util';

const NO_PID = -1;
const log = debug('dubbo:context');

export default class RequestContext<T = any> {
  private constructor() {
    log('new Context');
    //trace id
    this._uuid = '';
    this._pid = NO_PID;
    this._timeoutId = null;
    this._isSupportedDubbox = false;
    this._body = {err: null, res: null};
    this._application = {name: 'dubbo-js'};
    this._attachments = {};
    this._providerAttachments = {};
    this._request = <IContextRequestParam>{
      requestId: id(),
    };
  }

  /**
   * 当前dubbo请求的参数
   */
  private readonly _request: IContextRequestParam;

  /**
   * 当前dubbo返回的结果
   */
  private _body: IDubboResult<T>;

  /**
   * dubbo设置的application
   */
  private readonly _application: {name: string};

  /**
   * 是否支持dubbox,不希望通过版本2.8x来判断，不够语义化
   */
  private _isSupportedDubbox: boolean;

  /**
   * 当前promise的resolve
   */
  private _resolve: Function;

  /**
   * 当前promise的reject
   */
  private _reject: Function;

  /**
   * 当前上下文被host调用
   */
  private _invokeHost: string;

  /**
   * 当前上下文调用的port
   */
  private _invokePort: number;

  /**
   * 当前超时的上下文
   */
  private _timeoutId: NodeJS.Timer;

  /**
   * 当前上下文唯一的id，方便全链路日志跟踪
   */
  private _uuid: string;

  /**
   * socket-worker的pid，标记被socket-worker调度
   */
  private _pid: number;

  /**
   * 扩展attachments,支持自定义一些属性可以放在dubbo的encoder底层协议的attachment字段中
   */
  private _attachments: Object;

  /**
   * dubbo2.6.3 增加了 provider => consumer的attachments的能力
   * https://github.com/apache/incubator-dubbo/issues/889
   */
  private _providerAttachments: Object;

  static create<T = any>() {
    return new RequestContext<T>();
  }

  get isMethodArgsHessianType() {
    const {methodArgs} = this._request;
    return methodArgs.every(checkHessianParam);
  }

  get request() {
    return this._request;
  }

  get body() {
    return this._body;
  }

  set body(body: IDubboResult<any>) {
    this._body = body;
  }

  //=====================dubboRequest setter&&getter==========================
  set requestId(requestId: number) {
    log('requestId#%d set requestId: %d', this._request.requestId, requestId);
    this._request.requestId = requestId;
  }

  get requestId() {
    return this._request.requestId;
  }

  set methodName(name: string) {
    log('requestId#%d set methodName: %s', this._request.requestId, name);
    this._request.methodName = name;
  }

  get methodName() {
    return this._request.methodName;
  }

  set methodArgs(args: Array<IHessianType>) {
    log('requestId#%d set methodArgs: %O', this._request.requestId, args);
    this._request.methodArgs = args;
  }

  get methodArgs() {
    return this._request.methodArgs;
  }

  set dubboInterface(inf: string) {
    log('requestId#%d set dubboInterface: %s', this._request.requestId, inf);
    this._request.dubboInterface = inf;
  }

  get dubboInterface() {
    return this._request.dubboInterface;
  }

  set dubboVersion(version: string) {
    log('requestId#%d set dubboVersion: %s', this._request.requestId, version);
    this._request.dubboVersion = version;
  }

  set version(version: string) {
    log('requestId#%d set version: %s', this._request.requestId, version);
    this._request.version = version;
  }

  get version() {
    return this._request.version;
  }

  get dubboVersion() {
    return this._request.dubboVersion;
  }

  /**
   * 设置dubbo超时时间
   */
  set timeout(timeout: number) {
    log('requestId#%d set timeout: %d', this._request.requestId, timeout);
    this._request.timeout = timeout;
  }

  get timeout() {
    return this._request.timeout;
  }

  set group(group: string) {
    log('requestId#%d set group: %s', this._request.requestId, group);
    this._request.group = group;
  }

  get group() {
    return this._request.group;
  }

  set path(path: string) {
    log('requestId#%d set path: %d', this._request.requestId, path);
    this._request.path = path;
  }

  get path() {
    return this._request.path;
  }

  //===============application setter=========================
  set application(app: {name: string}) {
    log('requestId#%d set application: %O', this._request.requestId, app);
    this._application.name = app.name;
  }

  get application() {
    return this._application;
  }

  //===============resolve && reject=============================
  get resolve() {
    return this._resolve;
  }

  set resolve(resolve: Function) {
    log('requestId#%d set resolve: %O', this._request.requestId, resolve);
    this._resolve = resolve;
  }

  get reject() {
    return this._reject;
  }

  set reject(reject: Function) {
    log('requestId#%d set reject: %O', this._request.requestId, reject);
    this._reject = reject;
  }

  //=====================host port setter&&getter============
  set invokeHost(host: string) {
    log('requestId#%d set reject: %s', this._request.requestId, host);
    this._invokeHost = host;
  }

  get invokeHost() {
    return this._invokeHost;
  }

  set invokePort(port: number) {
    log('requestId#%d set invokePort: %d', this._request.requestId, port);
    this._invokePort = port;
  }

  get invokePort() {
    return this._invokePort;
  }

  //===========timeout setter&&getter=================
  set timeoutId(timeId: NodeJS.Timer) {
    log('requestId#%d set timeoutId', this._request.requestId);
    this._timeoutId = timeId;
  }

  cleanTimeout() {
    clearTimeout(this._timeoutId);
  }

  //============uuid setter&&getter==============
  set uuid(uuid: string) {
    this._uuid = uuid;
  }

  get uuid() {
    return this._uuid;
  }

  //==============pid======================
  set pid(pid: number) {
    log('requestId#%d set pid: %d', this._request.requestId, pid);
    this._pid = pid;
  }

  get pid() {
    return this._pid;
  }

  /**
   * 当前上下文是不是么有被处理被调度
   */
  get isNotScheduled() {
    return this._pid === NO_PID;
  }

  //======================isSupportedDubbox================
  set isSupportedDubbox(isSupportedDubbox: boolean) {
    this._isSupportedDubbox = isSupportedDubbox;
  }

  get isSupportedDubbox() {
    return this._isSupportedDubbox;
  }

  //=====================attachments=======================
  /**
   * 设置当前的attachments
   * @param key
   * @param value
   */
  set attachments(param: Object) {
    log('set attachments->%o', param);
    //auto merge
    this._attachments = {...this._attachments, ...param};
  }

  /**
   * 获取当前的attachments
   */
  get attachments(): Object {
    return this._attachments;
  }

  /**
   * 设置provider传递过来的attachments
   * @since dubbo2.6.3
   */
  set providerAttachments(param: Object) {
    log('set provider attachments->%o', param);
    this._providerAttachments = param;
  }

  /**
   * 设置provider传递过来的attachments
   * @since dubbo2.6.3
   */
  get providerAttachments() {
    return this._providerAttachments;
  }
}

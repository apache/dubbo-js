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

import debug from 'debug'
import cfg from './config'
import { id } from './request-id'
import { util } from 'apache-dubbo-common'
import { DubboInvokeTimeout } from './err'
import { IContextRequestParam, IDubboResult, IHessianType } from './types'

const log = debug('dubbo:context')

export default class Context<T = any> {
  /**
   * dubbo设置的application
   */
  private readonly _application: { name: string }
  /**
   * 当前dubbo请求的参数
   */
  private readonly _request: IContextRequestParam

  /**
   * 当前dubbo返回的结果
   */
  private _body: IDubboResult<T>

  /**
   * 扩展attachments,支持自定义一些属性可以放在dubbo的encoder底层协议的attachment字段中
   */
  private _attachments: Object

  /**
   * dubbo2.6.3 增加了 provider => consumer的attachments的能力
   * https://github.com/apache/incubator-dubbo/issues/889
   */
  private _providerAttachments: Object

  /**
   * 是否支持dubbox,不希望通过版本2.8x来判断，不够语义化
   */
  private _isSupportedDubbox: boolean

  /**
   * 当前上下文唯一的id，方便全链路日志跟踪
   */
  private _traceId: string

  private _invokedByHost: string

  private timer: NodeJS.Timer
  private _timeout: number

  /**
   * 当前promise的resolve
   */
  private _resolve: Function

  /**
   * 当前promise的reject
   */
  private _reject: Function

  private constructor() {
    log('new Context')
    this._traceId = ''
    this._invokedByHost = ''
    this._isSupportedDubbox = false
    this._body = { err: null, res: null }
    this._application = { name: 'dubbo-js' }
    this._attachments = {}
    this._providerAttachments = {}
    this._request = <IContextRequestParam>{
      requestId: id(),
      group: ''
    }
    // max timeout
    this._timeout = this._request.timeout || cfg.dubboInvokeTimeout
  }

  static init<T = any>() {
    return new Context<T>()
  }

  get isRequestMethodArgsHessianType() {
    const { methodArgs } = this._request
    return methodArgs.every(util.checkHessianParam)
  }

  get request() {
    return this._request
  }

  get body() {
    return this._body
  }

  set body(body: IDubboResult<any>) {
    this._body = body
  }

  //=====================dubboRequest setter&&getter==========================
  set requestId(requestId: number) {
    log('requestId#%d set requestId: %d', this._request.requestId, requestId)
    this._request.requestId = requestId
  }

  get requestId() {
    return this._request.requestId
  }

  set methodName(name: string) {
    log('requestId#%d set methodName: %s', this._request.requestId, name)
    this._request.methodName = name
  }

  get methodName() {
    return this._request.methodName
  }

  set methodArgs(args: Array<IHessianType>) {
    log('requestId#%d set methodArgs: %O', this._request.requestId, args)
    this._request.methodArgs = args
  }

  get methodArgs() {
    return this._request.methodArgs
  }

  set dubboInterface(inf: string) {
    log('requestId#%d set dubboInterface: %s', this._request.requestId, inf)
    this._request.dubboInterface = inf
  }

  get dubboInterface() {
    return this._request.dubboInterface
  }

  set dubboVersion(version: string) {
    log('requestId#%d set dubboVersion: %s', this._request.requestId, version)
    this._request.dubboVersion = version
  }

  set version(version: string) {
    log('requestId#%d set version: %s', this._request.requestId, version)
    this._request.version = version
  }

  get version() {
    return this._request.version
  }

  get dubboVersion() {
    return this._request.dubboVersion
  }

  set group(group: string) {
    log('requestId#%d set group: %s', this._request.requestId, group)
    this._request.group = group
  }

  get group() {
    return this._request.group
  }

  set path(path: string) {
    log('requestId#%d set path: %d', this._request.requestId, path)
    this._request.path = path
  }

  get path() {
    return this._request.path
  }

  //===============application setter=========================
  set application(app: { name: string }) {
    log('requestId#%d set application: %O', this._request.requestId, app)
    this._application.name = app.name
  }

  get application() {
    return this._application
  }

  //===============resolve && reject=============================
  get resolve() {
    return this._resolve
  }

  set resolve(resolve: Function) {
    this._resolve = resolve
  }

  get reject() {
    return this._reject
  }

  set reject(reject: Function) {
    log('requestId#%d set reject: %O', this._request.requestId, reject)
    this._reject = reject
  }

  //============uuid setter&&getter==============
  set traceId(uuid: string) {
    this._traceId = uuid
  }

  get traceId() {
    return this._traceId
  }

  /**
   * 当前上下文是不是么有被处理被调度
   */
  get wasInvoked() {
    return this._invokedByHost != ''
  }

  set invokedByHost(host: string) {
    this._invokedByHost = host
  }

  get invokedByHost() {
    return this._invokedByHost
  }

  //======================isSupportedDubbox================
  set isSupportedDubbox(isSupportedDubbox: boolean) {
    this._isSupportedDubbox = isSupportedDubbox
  }

  get isSupportedDubbox() {
    return this._isSupportedDubbox
  }

  //=====================attachments=======================
  /**
   * 设置当前的attachments
   * @param param
   */
  set attachments(param: Object) {
    log('set attachments->%o', param)
    //auto merge
    this._attachments = { ...this._attachments, ...param }
  }

  /**
   * 获取当前的attachments
   */
  get attachments(): Object {
    return this._attachments
  }

  /**
   * 设置provider传递过来的attachments
   * @since dubbo2.6.3
   */
  set providerAttachments(param: Object) {
    log('set provider attachments->%o', param)
    this._providerAttachments = param
  }

  /**
   * 设置provider传递过来的attachments
   * @since dubbo2.6.3
   */
  get providerAttachments() {
    return this._providerAttachments
  }

  //===================timeout=========================
  get timeout() {
    return this._timeout
  }

  set timeout(timeout: number) {
    this._timeout = timeout || cfg.dubboInvokeTimeout
  }

  setMaxTimeout(end: Function) {
    log(
      'requestId#%d, set max timeout handler, max timeout: %d',
      this.requestId,
      this._timeout
    )
    this.timer = setTimeout(() => {
      this.reject &&
        this.reject(
          new DubboInvokeTimeout(
            `invoke ${this.dubboInterface}#${this.methodName}?group=${this.group}&version=${this.version}`
          )
        )
      end()
      this.cleanTimeout()
    }, this._timeout)
  }

  cleanTimeout() {
    log('clean requestId#%d timeout', this.requestId)
    clearTimeout(this.timer)
  }
}

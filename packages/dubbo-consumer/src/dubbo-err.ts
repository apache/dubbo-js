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

/**
 * dubbo invoke timeout error
 */
export class DubboInvokeTimeout extends Error {}

/**
 * dubbo encoder error
 */
export class DubboEncodeError extends Error {}

/**
 * dubbo timeout error
 */
export class DubboTimeoutError extends Error {}

/**
 * dubbo method param not hessian error
 */
export class DubboMethodParamNotHessianError extends Error {}

/**
 * dubbo schedule error
 */
export class DubboScheduleError extends Error {}

/**
 * socket error
 */
export class SocketError extends Error {}

/**
 * zookeeper expired error
 */
export class ZookeeperExpiredError extends Error {}

/**
 * fault exit error
 */
export class FaultExitError extends Error {
  //copy message and stack
  constructor(err: Error) {
    super(err.message)
    this.message = err.message
    this.stack = err.stack
    this.name = err.name
  }
}

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

import { EventEmitter } from 'events'
import { IHessianType } from './types'

export const msg = new EventEmitter()
export const noop = () => {}

// ~~~~~~~~~~~~~~~~~~~~~~~~ types~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const toString = Object.prototype.toString

export const isBoolean = (param: any): param is boolean =>
  toString.call(param) === '[object Boolean]'

export const isString = (param: any): param is string =>
  toString.call(param) === '[object String]'

export const isNumber = (param: any): param is number =>
  toString.call(param) === '[object Number]'

export const isMap = (param: any): param is Map<any, any> =>
  param instanceof Map

export const isFn = (param: any): param is Function =>
  toString.call(param) === '[object Function]'

export const isObj = (param: any): param is Object =>
  toString.call(param) === '[object Object]'

export const isRegExp = (arg: any): arg is RegExp =>
  toString.call(arg) === '[object RegExp]'

export const isArray = (arg: any): arg is Array<string> =>
  toString.call(arg) === '[object Array]'

// ~~~~~~~~~~~~~~~~~~~~~~~~util methods~~~~~~~~~~~~~~~~~~~~~

/**
 * check param is hessian type
 * @param param
 */
export function checkHessianParam(param: any): param is IHessianType {
  return (
    typeof param === 'object' &&
    typeof param['$class'] !== 'undefined' &&
    typeof param['$'] !== 'undefined'
  )
}

/**
 * check hessian
 * @param res
 */
export function checkRetValHessian(res: any) {
  // allow method return undefined, boolean, number, string, map directly
  if (
    typeof res === 'undefined' ||
    isBoolean(res) ||
    isNumber(res) ||
    isString(res) ||
    isMap(res)
  ) {
    return true
  }
  const hessian = res.__fields2java ? res.__fields2java() : res
  return checkHessianParam(hessian)
}

/**
 * Dubbo Version
 */
export class Version {
  private static version2Int = new Map<string, number>()
  static LEGACY_DUBBO_PROTOCOL_VERSION = 10000
  static LOWEST_VERSION_FOR_RESPONSE_ATTACHMENT = 2000200 // 2.0.2
  static HIGHEST_PROTOCOL_VERSION = 2009900 // 2.0.99

  static isSupportResponseAttachment(version: string) {
    if (!version) {
      return false
    }
    const v = Version.getIntVersion(version)
    return (
      v >= Version.LOWEST_VERSION_FOR_RESPONSE_ATTACHMENT &&
      v <= Version.HIGHEST_PROTOCOL_VERSION
    )
  }

  static getIntVersion(version: string) {
    let v = Version.version2Int.get(version)
    if (!v) {
      try {
        v = Version.parseInt(version)
        if (version.split('.').length == 3) {
          v = v * 100
        }
      } catch (err) {
        console.error(
          'Please make sure your version value has the right format: ' +
            '\n 1. only contains digital number: 2.0.0; \n 2. with string suffix: 2.6.7-stable. ' +
            '\nIf you are using Dubbo before v2.6.2, the version value is the same with the jar version.'
        )
        v = this.LEGACY_DUBBO_PROTOCOL_VERSION
      }
      this.version2Int.set(version, v)
    }
    return v
  }

  static parseInt(version: string) {
    let v = 0
    const vArr = version.split('.')
    const len = vArr.length
    for (let i = 0; i < len; i++) {
      const subversion = Version.getPrefixDigits(vArr[i])
      if (subversion) {
        v += parseInt(subversion) * Math.pow(10, (len - i - 1) * 2)
      }
    }
    return v
  }

  static getPrefixDigits(v: string): string {
    const match = v.match(/^([0-9]*).*/)
    return match ? match[1] : ''
  }
}

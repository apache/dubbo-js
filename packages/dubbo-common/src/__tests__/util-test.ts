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

import EventEmitter from 'events'
import { ITrace } from '../types'
import {
  checkHessianParam,
  checkRetValHessian,
  isBoolean,
  isFn,
  isMap,
  isNumber,
  isString,
  msg,
  Version
} from '../util'

describe('test util method', () => {
  it('msg pub/sub', () => {
    expect(msg).toBeDefined()
    expect(msg instanceof EventEmitter).toBeTruthy()

    msg.on('hello', (data) => {
      expect(data).toEqual({ name: '@apache/dubbo-js' })
    })

    msg.emit('hello', { name: '@apache/dubbo-js' })
  })

  it('isBoolean', () => {
    expect(isBoolean(false)).toBeTruthy()
    expect(isBoolean(true)).toBeTruthy()

    expect(isBoolean(1)).toBeFalsy()
    expect(isBoolean('')).toBeFalsy()
    expect(isBoolean(undefined)).toBeFalsy()
  })

  it('isString', () => {
    expect(isString('')).toBeTruthy()

    expect(isString(true)).toBeFalsy()
    expect(isString(1)).toBeFalsy()
    expect(isString(undefined)).toBeFalsy()
  })

  it('isNumber', () => {
    expect(isNumber(1)).toBeTruthy()
    expect(isNumber(1.0)).toBeTruthy()

    expect(isNumber(true)).toBeFalsy()
    expect(isNumber('')).toBeFalsy()
    expect(isNumber(undefined)).toBeFalsy()
  })

  it('isMap', () => {
    const map = new Map()
    expect(isMap(map)).toBeTruthy()

    expect(isMap(1.0)).toBeFalsy()
    expect(isMap(true)).toBeFalsy()
    expect(isMap('')).toBeFalsy()
    expect(isMap(undefined)).toBeFalsy()
  })

  it('isFn', () => {
    expect(isFn(() => {})).toBeTruthy()

    expect(isFn('')).toBeFalsy()
    expect(isFn(1.0)).toBeFalsy()
    expect(isFn(true)).toBeFalsy()
    expect(isFn('')).toBeFalsy()
    expect(isFn(undefined)).toBeFalsy()
  })

  it('checkHessianParam', () => {
    expect(checkHessianParam({ $class: 'java.lang.Long', $: 123 })).toBeTruthy()
    expect(checkHessianParam('')).toBeFalsy()
    expect(checkHessianParam(1)).toBeFalsy()
    expect(checkHessianParam(true)).toBeFalsy()
    expect(checkHessianParam({})).toBeFalsy()
  })

  it('checkRetValHessian', () => {
    expect(checkRetValHessian(undefined)).toBeTruthy()
    expect(checkRetValHessian(true)).toBeTruthy()
    expect(checkRetValHessian(0)).toBeTruthy()
    expect(checkRetValHessian('')).toBeTruthy()
    expect(checkRetValHessian(new Map())).toBeTruthy()

    expect(checkRetValHessian({})).toBeFalsy()
    expect(
      checkRetValHessian({
        __fields2java() {
          return { $class: 'java.lang.String', $: 'hello' }
        }
      })
    ).toBeTruthy()
  })

  it('trace', () => {
    msg.on('sys:trace', (data: ITrace) => {
      expect(data.type).toEqual('INFO')
      expect(data.msg).toEqual('@apache/dubbo-js')
    })
  })

  it('version', () => {
    expect(Version.isSupportResponseAttachment('2.0.2')).toBeTruthy()
    expect(Version.isSupportResponseAttachment('2.0.99')).toBeTruthy()

    expect(Version.isSupportResponseAttachment('2.0.0')).toBeFalsy()
    expect(Version.isSupportResponseAttachment('2.0.199')).toBeFalsy()

    expect(Version.getIntVersion('2.0.2')).toEqual(2000200)
  })
})

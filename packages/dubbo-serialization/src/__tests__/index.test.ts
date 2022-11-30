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

import { loadProto, lookup, encode, decode } from '..'
import { Type } from 'protobufjs'
import path from 'path'

describe('test serialization', () => {
  test('loadProto', () => {
    const root = loadProto(path.join(__dirname, './proto'))
    // test current folder
    expect(root.lookupType('test.Test1')).toBeInstanceOf(Type)
    // test sub folder
    expect(root.lookupType('sub.Test1')).toBeInstanceOf(Type)
  })

  test('lookup', () => {
    // validate param type
    expect(() => lookup(1)).toThrowError(/^typeName must be a string$/)
    // TODO : load proto before lookup
    // expect(() => lookup('')).toThrowError(/^Please load proto before lookup$/)
    // lookupType
    const root = loadProto(path.join(__dirname, './proto'))
    expect(root.lookupType('test.Test1')).toBeInstanceOf(Type)
  })

  test('encode', () => {
    loadProto(path.join(__dirname, './proto'))
    // encode error type
    expect(() => encode({}, 'test.Test2')).toThrowError(
      /^no such type: test.Test2$/
    )
    expect(encode({ field1: '1' }, 'test.Test1')).toBeInstanceOf(Buffer)
  })

  test('decode', () => {
    loadProto(path.join(__dirname, './proto'))
    const msg = encode({ field1: '1' }, 'test.Test1')
    // correct
    expect(decode(msg, 'test.Test1')).toMatchObject({ field1: '1' })
    // error
    expect(decode(msg, 'test.Test1')).not.toMatchObject({ field1: '2' })
  })
})

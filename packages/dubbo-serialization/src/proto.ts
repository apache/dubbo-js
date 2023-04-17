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

import path from 'node:path'
import glob from 'glob'
import { loadSync, Root, Type } from 'protobufjs'

let protoCache: Root | undefined = undefined

/**
 * 加载所有的proto文件
 * @param dir 文件路径
 * @returns Root namespace
 */
function loadProto(dir: string) {
  const files = glob.sync(path.join(dir, '**', '*.proto').replace(/\\/g, '/'))
  protoCache = loadSync(files)
  return protoCache
}

/**
 * 根据typeName寻找proto
 * @param typeName
 * @returns Reflected message type
 */
function lookup(typeName: string): Type {
  if (!protoCache) {
    throw new TypeError('Please load proto before lookup')
  }
  if (typeof typeName !== 'string') {
    throw new TypeError('typeName must be a string')
  }
  return protoCache.lookupType(typeName)
}

/**
 * Creates a new message of this type using the specified properties.
 * @param params 参数
 * @param protoName 名称
 * @returns 类型
 */
function encode<T extends { [k: string]: unknown }>(data: T, type: string) {
  // 根据protoName找到对应的message
  const Message = lookup(type)
  return Message.encode(Message.create(data)).finish()
}

/**
 *
 * @param data 解码数据
 * @param type pb类型
 * @returns
 */
function decode<T = { [k: string]: unknown }>(data: Buffer, type: string): T {
  const Message = lookup(type)
  return Message.decode(data).toJSON() as T
}

export { loadProto, lookup, encode, decode }

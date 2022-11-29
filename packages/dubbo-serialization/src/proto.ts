import fs from 'fs'
import path from 'path'
import _ from 'lodash'
import { loadSync, Root, Type, Message } from 'protobufjs'

let _proto: Root | undefined = undefined

/**
 * 加载所有的proto文件
 * @param dir 文件路径
 * @returns Root namespace
 */
function loadProtoDir(dir: string) {
  const files = fs.readdirSync(dir)
  // todo 优化成flatMap
  const protoFiles = files
    .filter((fileName) => fileName.endsWith('.proto'))
    .map((fileName) => path.join(dir, fileName))
  _proto = loadSync(protoFiles)
  return _proto
}

/**
 * 根据typeName寻找proto
 * @param typeName
 * @returns Reflected message type
 */
function lookup(typeName: string): Type {
  if (!_.isString(typeName)) {
    throw new TypeError('typeName must be a string')
  }
  if (!_proto) {
    throw new TypeError('Please load proto before lookup')
  }
  return _proto.lookupType(typeName)
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
  if (!Message) {
    throw new TypeError(`${type} not found, please check it again`)
  }
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

export { loadProtoDir, lookup, encode, decode }

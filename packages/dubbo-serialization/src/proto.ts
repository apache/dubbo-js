import fs from 'fs'
import path from 'path'
import _ from 'lodash'
import { loadSync, Root, Type } from 'protobufjs'

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
function lookupType(typeName: string): Type {
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
 * @param protoName 名称
 * @param params 参数
 * @returns 类型
 */
function create(protoName: string, params: any) {
  // 根据protoName找到对应的message
  const Message = lookupType(protoName)
  if (!Message) {
    throw new TypeError(`${protoName} not found, please check it again`)
  }
  return Message.create(params)
}

export { loadProtoDir, lookupType, create }

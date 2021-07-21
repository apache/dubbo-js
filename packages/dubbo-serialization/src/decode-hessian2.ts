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
import Hessian from 'hessian.js'
import { byte } from 'apache-dubbo-common'
import { DubboDecodeError, DubboServiceError } from './err'
import { IDubboResponse } from './types'
import {
  DEFAULT_DUBBO_PROTOCOL_VERSION,
  DUBBO_FLAG_REQUEST,
  DUBBO_HEADER_LENGTH,
  DUBBO_RESPONSE_BODY_FLAG,
  DUBBO_RESPONSE_STATUS,
  HESSIAN2_SERIALIZATION_CONTENT_ID
} from './constants'
import Request from './request'

const reqLog = debug('dubbo:decodeDubboRequest')
export function decodeDubboRequest(buff: Buffer): Request {
  const flag = buff[2]
  // get requestId
  const requestId = byte.fromBytes8(buff.slice(4, 12))
  reqLog('decode requestId -> ', requestId)
  const req = new Request(requestId)

  // decode request
  if ((flag & DUBBO_FLAG_REQUEST) !== 0) {
    req.version = DEFAULT_DUBBO_PROTOCOL_VERSION

    const decoder = new Hessian.DecoderV2(buff.slice(DUBBO_HEADER_LENGTH))
    // decode request
    const dubboVersion = decoder.read()
    req.version = dubboVersion
    req.attachment.dubbo = dubboVersion

    req.attachment.path = decoder.read()
    req.attachment.version = decoder.read()
    req.methodName = decoder.read()

    const desc = decoder.read()
    req.parameterTypeDesc = desc

    if (desc.length > 0) {
      const parameterTypes: Array<string> = desc.split(';').filter(Boolean)
      req.parameterTypes = parameterTypes
      const len = parameterTypes.length
      const args = []
      for (let i = 0; i < len; i++) {
        args.push(decoder.read())
      }
      req.args = args
    }

    // merge attachment
    const attachment = decoder.read()
    if (attachment !== null) {
      Object.keys(attachment).forEach((k) => {
        req.attachment[k] = attachment[k]
      })
    }
  }

  return req
}

const resLog = debug('dubbo:decodeDubboResponse')
//com.alibaba.dubbo.remoting.exchange.codec.ExchangeCodec.encodeResponse/decode
export function decodeDubboResponse<T>(bytes: Buffer): IDubboResponse<T> {
  let res = null
  let err = null
  let attachments = {}

  // set request and serialization flag.
  //字节位置[4-11] 8 bytes
  const requestIdBuff = bytes.slice(4, 12)
  const requestId = byte.fromBytes8(requestIdBuff)
  resLog(`decode parse requestId: ${requestId}`)

  const typeId = bytes[2]

  if (typeId !== HESSIAN2_SERIALIZATION_CONTENT_ID) {
    return {
      err: new DubboDecodeError(`only support hessian serialization`),
      res: null,
      attachments,
      requestId
    }
  }

  // get response status.
  const status = bytes[3]

  resLog(
    `parse response status: ${status}, DUBBO_RESPONSE_STATUS: ${
      DUBBO_RESPONSE_STATUS[DUBBO_RESPONSE_STATUS.OK]
    }`
  )

  //com.alibaba.dubbo.rpc.protocol.dubbo.DecodeableRpcResult
  const body = new Hessian.DecoderV2(bytes.slice(DUBBO_HEADER_LENGTH))

  if (status != DUBBO_RESPONSE_STATUS.OK) {
    return {
      err: new DubboServiceError(body.read()),
      res: null,
      attachments,
      requestId
    }
  }

  // current status flag
  const flag = body.readInt()

  resLog(
    `parse dubbo response body flag: ${flag}, DUBBO_RESPONSE_BODY_FLAG: ${DUBBO_RESPONSE_BODY_FLAG[flag]}`
  )

  switch (flag) {
    case DUBBO_RESPONSE_BODY_FLAG.RESPONSE_VALUE:
      err = null
      res = body.read()
      attachments = {}
      break
    case DUBBO_RESPONSE_BODY_FLAG.RESPONSE_NULL_VALUE:
      err = null
      res = null
      attachments = {}
      break
    case DUBBO_RESPONSE_BODY_FLAG.RESPONSE_WITH_EXCEPTION:
      const exception = body.read()
      err =
        exception instanceof Error
          ? exception
          : new DubboServiceError(exception)
      res = null
      attachments = {}
      break
    case DUBBO_RESPONSE_BODY_FLAG.RESPONSE_NULL_VALUE_WITH_ATTACHMENTS:
      err = null
      res = null
      attachments = body.read()
      break
    case DUBBO_RESPONSE_BODY_FLAG.RESPONSE_VALUE_WITH_ATTACHMENTS:
      err = null
      res = body.read()
      attachments = body.read()
      break
    case DUBBO_RESPONSE_BODY_FLAG.RESPONSE_WITH_EXCEPTION_WITH_ATTACHMENTS:
      const exp = body.read()
      err = exp instanceof Error ? exp : new DubboServiceError(exp)
      res = null
      attachments = body.read()
      break
    default:
      err = new DubboDecodeError(
        `Unknown result flag, expect '0/1/2/3/4/5', get  ${flag})`
      )
      res = null
  }

  return { requestId, err, res, attachments }
}

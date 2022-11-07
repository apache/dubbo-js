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
import { util } from 'apache-dubbo-common'
import { DubboEncodeError } from './err'
import ByteBuffer from './byte-buffer'
import { d$ } from 'apache-dubbo-common'
import { IRequestContext, IResponseContext } from './types'
import { DubboEncoder } from './dubbo-serialization'

const log = debug('dubbo:hessian:encoderV2')

export class Hessian2Encoder implements DubboEncoder {
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ encode dubbo request ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`
  /**
   * 根据协议，
   * header:
   *  消息中写入16个字节的消息头：
   *  1-2字节，固定的魔数
   *  第3个字节，第7位存储数据类型是请求数据还是响应数据，其它8位存储序列化类型，约定和服务端的序列化-反序列化协议
   *  5-12个字节，请求id
   *  13-16个字节，请求数据长度
   * body: hessian body
   */
  encodeDubboRequest(ctx: IRequestContext): Buffer {
    // body buffer
    const body = this.encodeRequestBody(ctx)

    // byte buffer
    return (
      new ByteBuffer({ defaultAllocSize: body.length + 16 })
        // write magic header
        .writeShort(d$.DUBBO_MAGIC_HEADER)
        // write flag
        .writeByte(
          d$.DUBBO_FLAG_REQUEST |
            d$.HESSIAN2_SERIALIZATION_CONTENT_ID |
            d$.DUBBO_FLAG_TWOWAY,
          {
            unsigned: true
          }
        )
        // skip status
        // write requestID
        .writeLong(ctx.requestId, { unsigned: true, index: 4 })
        // write payload length
        .writeInt(body.length, { unsigned: true })
        // concat body
        .writeBytes(body)
        .buffer()
    )
  }

  /**
   * encode dubbo request hessian body
   * @param ctx
   * @returns
   */
  private encodeRequestBody(ctx: IRequestContext): Buffer {
    // new hessian encoder v2
    const encoder = new Hessian.EncoderV2()

    // dubbo version
    encoder.write(ctx.dubboVersion)
    // path interface
    encoder.write(ctx.dubboInterface)
    // interface version
    encoder.write(ctx.version)
    // method name
    encoder.write(ctx.methodName)
    //supported dubbox
    if (ctx.isSupportedDubbox) {
      encoder.write(-1)
    }
    //parameter types
    encoder.write(getParamJavaTypes(ctx.methodArgs))
    //arguments
    if (ctx.methodArgs && ctx.methodArgs.length) {
      for (let arg of ctx.methodArgs) {
        encoder.write(arg)
      }
    }

    //attachments
    encoder.write(this.buildRequestAttachments(ctx))

    // check payload length
    checkPayload(encoder.byteBuffer._offset)

    // return body buffer
    return encoder.byteBuffer._bytes.slice(0, encoder.byteBuffer._offset)
  }

  /**
   * build request attachmenet hashmap
   * @param ctx
   * @returns
   */
  private buildRequestAttachments(ctx: IRequestContext) {
    const attachmentsHashMap = {
      $class: 'java.util.HashMap',
      $: {
        ...{
          path: ctx.path,
          interface: ctx.dubboInterface,
          version: ctx.version || '0.0.0'
        },
        ...ctx.attachments
      }
    }

    const $ = attachmentsHashMap.$
    ctx.group && ($['group'] = ctx.group)
    ctx.timeout && ($['timeout'] = ctx.timeout)
    ctx.application.name && ($['application'] = ctx.application.name)

    log('request#%d attachment ', ctx.requestId, attachmentsHashMap)
    return attachmentsHashMap
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ encode dubbo response ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`

  encodeDubboResponse(ctx: IResponseContext): Buffer {
    const body = this.encodeResponseBody(ctx)
    return (
      new ByteBuffer({ defaultAllocSize: body.length + 16 })
        // set magic number
        .writeShort(d$.DUBBO_MAGIC_HEADER)
        // set request and serialization flag.
        .writeByte(d$.HESSIAN2_SERIALIZATION_ID)
        // set response status
        .writeByte(ctx.status)
        //set requestId
        .writeLong(ctx.request.requestId)
        // write payload
        .writeInt(body.length, { unsigned: true })
        .writeBytes(body)
        .buffer()
    )
  }

  encodeResponseBody(ctx: IResponseContext): Buffer {
    const encoder = new Hessian.EncoderV2()

    const isSupportAttachment = util.Version.isSupportResponseAttachment(
      ctx.request.version
    )

    if (ctx.status !== d$.DUBBO_RESPONSE_STATUS.OK) {
      encoder.write(
        `${d$.DUBBO_RESPONSE_STATUS[ctx.status]}#${ctx.body.err.message}`
      )
    } else {
      // failed invoke
      if (ctx.body.err) {
        encoder.write(
          isSupportAttachment
            ? d$.DUBBO_RESPONSE_BODY_FLAG
                .RESPONSE_WITH_EXCEPTION_WITH_ATTACHMENTS
            : d$.DUBBO_RESPONSE_BODY_FLAG.RESPONSE_WITH_EXCEPTION
        )
        encoder.write(ctx.body.err.message)
      }
      // invoke successfully  and return result
      else if (ctx.body.res) {
        encoder.write(
          isSupportAttachment
            ? d$.DUBBO_RESPONSE_BODY_FLAG.RESPONSE_VALUE_WITH_ATTACHMENTS
            : d$.DUBBO_RESPONSE_BODY_FLAG.RESPONSE_VALUE
        )
        encoder.write(ctx.body.res)
      }
      // invoke successfully and return void
      else {
        encoder.write(
          isSupportAttachment
            ? d$.DUBBO_RESPONSE_BODY_FLAG.RESPONSE_NULL_VALUE_WITH_ATTACHMENTS
            : d$.DUBBO_RESPONSE_BODY_FLAG.RESPONSE_NULL_VALUE
        )
      }
    }

    // write attachments when support attachment
    if (isSupportAttachment) {
      const attachments = ctx.attachments
      attachments['dubbo'] = '2.0.2'
      encoder.write(attachments)
    }

    // check payload length
    try {
      checkPayload(encoder.byteBuffer._offset)
    } catch (err) {
      encoder.clear()
      encoder.write(
        isSupportAttachment
          ? d$.DUBBO_RESPONSE_BODY_FLAG.RESPONSE_WITH_EXCEPTION_WITH_ATTACHMENTS
          : d$.DUBBO_RESPONSE_BODY_FLAG.RESPONSE_WITH_EXCEPTION
      )
      encoder.write(
        `${d$.DUBBO_RESPONSE_STATUS[ctx.status]}#${ctx.body.err.message}`
      )
    }

    return encoder.byteBuffer._bytes.slice(0, encoder.byteBuffer._offset)
  }
}

function checkPayload(payload: number) {
  //check body length
  if (payload > 0 && payload > d$.DUBBO_DEFAULT_PAY_LOAD) {
    throw new DubboEncodeError(
      `Data length too large: ${payload}, max payload: ${d$.DUBBO_DEFAULT_PAY_LOAD}`
    )
  }
}

/**
 * get java param types
 * @param args
 * @returns
 */
function getParamJavaTypes(args: Array<any>) {
  if (!(args && args.length)) {
    return ''
  }

  const primitiveTypeRef = {
    void: 'V',
    boolean: 'Z',
    byte: 'B',
    char: 'C',
    double: 'D',
    float: 'F',
    int: 'I',
    long: 'J',
    short: 'S'
  }

  const desc = []

  for (let arg of args) {
    let type: string = arg['$class']

    while (type[0] === '[') {
      //1. c is array
      desc.push('[')
      type = type.slice(1)
    }

    if (primitiveTypeRef[type]) {
      //2. c is primitive
      desc.push(primitiveTypeRef[type])
    } else {
      //3. c is object
      desc.push('L')
      desc.push(type.replace(/\./gi, '/'))
      desc.push(';')
    }
  }

  return desc.join('')
}

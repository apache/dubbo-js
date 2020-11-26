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

import debug from 'debug';
import Hessian from 'hessian.js';
import {toBytes8} from '../common/byte';
import RequestContext from '../consumer/request-context';
import {DubboEncodeError} from '../common/err';
import {isDevEnv, Version} from '../common/util';
import {
  DUBBO_MAGIC_HEADER,
  DUBBO_FLAG_REQUEST,
  DUBBO_FLAG_TWOWAY,
  DUBBO_HEADER_LENGTH,
  DUBBO_DEFAULT_PAY_LOAD,
  HESSIAN2_SERIALIZATION_ID,
  HESSIAN2_SERIALIZATION_CONTENT_ID,
  DUBBO_RESPONSE_BODY_FLAG,
  DUBBO_MAGIC_HIGH,
  DUBBO_MAGIC_LOW,
} from './constants';
import ResponseContext, {ResponseStatus} from '../server/response-context';

const log = debug('dubbo:hessian:encoderV2');

const checkPayload = (payload: number) => {
  //check body length
  if (payload > 0 && payload > DUBBO_DEFAULT_PAY_LOAD) {
    throw new DubboEncodeError(
      `Data length too large: ${payload}, max payload: ${DUBBO_DEFAULT_PAY_LOAD}`,
    );
  }
};

//dubbo hessian serialization
//com.alibaba.dubbo.remoting.exchange.codec.ExchangeCodec
//encodeRequest

export class DubboRequestEncoder {
  constructor(ctx: RequestContext) {
    this._ctx = ctx;
    if (isDevEnv) {
      log(
        'dubbo encode param request:%s',
        JSON.stringify(this._ctx.request, null, 2),
      );
    }
  }

  private readonly _ctx: RequestContext;

  encode() {
    const body = this.encodeBody();
    const head = this.encodeHead(body.length);
    log(`encode body length: ${body.length} bytes`);
    return Buffer.concat([head, body]);
  }

  /**
   * 根据协议，消息中写入16个字节的消息头：
   * 1-2字节，固定的魔数
   * 第3个字节，第7位存储数据类型是请求数据还是响应数据，其它8位存储序列化类型，约定和服务端的序列化-反序列化协议
   * 5-12个字节，请求id
   * 13-16个字节，请求数据长度
   *
   * @param payload body的长度
   */
  private encodeHead(payload: number) {
    //header
    const header = Buffer.alloc(DUBBO_HEADER_LENGTH);

    //set magic number
    //magic high
    header[0] = DUBBO_MAGIC_HEADER >>> 8;
    //magic low
    header[1] = DUBBO_MAGIC_HEADER & 0xff;

    // set request and serialization flag.
    header[2] =
      DUBBO_FLAG_REQUEST |
      HESSIAN2_SERIALIZATION_CONTENT_ID |
      DUBBO_FLAG_TWOWAY;

    //requestId
    this.setRequestId(header);

    //body长度int-> 4个byte

    header.writeUInt32BE(payload, 12);
    return header;
  }

  private setRequestId(header: Buffer) {
    const {requestId} = this._ctx;
    log(`encode header requestId: ${requestId}`);
    const buffer = toBytes8(requestId);
    header[4] = buffer[0];
    header[5] = buffer[1];
    header[6] = buffer[2];
    header[7] = buffer[3];
    header[8] = buffer[4];
    header[9] = buffer[5];
    header[10] = buffer[6];
    header[11] = buffer[7];
  }

  private encodeBody() {
    //hessian v2
    const encoder = new Hessian.EncoderV2();

    const {
      dubboVersion,
      dubboInterface,
      version,
      methodName,
      methodArgs,
    } = this._ctx;

    //dubbo version
    encoder.write(dubboVersion);
    //path interface
    encoder.write(dubboInterface);
    //interface version
    encoder.write(version);
    //method name
    encoder.write(methodName);

    //supported dubbox
    if (this._ctx.isSupportedDubbox) {
      encoder.write(-1);
    }
    //parameter types
    encoder.write(DubboRequestEncoder.getParameterTypes(methodArgs));

    //arguments
    if (methodArgs && methodArgs.length) {
      for (let arg of methodArgs) {
        encoder.write(arg);
      }
    }

    //attachments
    encoder.write(this.getAttachments());

    // check payload lenght
    checkPayload(encoder.byteBuffer._offset);

    return encoder.byteBuffer._bytes.slice(0, encoder.byteBuffer._offset);
  }

  private static getParameterTypes(args: Array<any>) {
    if (!(args && args.length)) {
      return '';
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
      short: 'S',
    };

    const desc = [];

    for (let arg of args) {
      let type: string = arg['$class'];

      //暂时不支持二维数组
      //如果将来支持，这个地方要while判断下
      if (type[0] === '[') {
        //1. c is array
        desc.push('[');
        type = type.slice(1);
      }

      if (primitiveTypeRef[type]) {
        //2. c is primitive
        desc.push(primitiveTypeRef[type]);
      } else {
        //3. c is object
        desc.push('L');
        desc.push(type.replace(/\./gi, '/'));
        desc.push(';');
      }
    }

    return desc.join('');
  }

  private getAttachments() {
    const {
      requestId,
      path,
      dubboInterface,
      group,
      timeout,
      version,
      application: {name},
      attachments,
    } = this._ctx;

    //merge dubbo attachments and customize attachments
    const map = {
      ...{
        path: path,
        interface: dubboInterface,
        version: version || '0.0.0',
      },
      ...attachments,
    };

    group && (map['group'] = group);
    timeout && (map['timeout'] = timeout);
    name && (map['application'] = name);

    let attachmentsHashMap = {
      $class: 'java.util.HashMap',
      $: map,
    };

    if (isDevEnv) {
      log(
        'request#%d attachment %s',
        requestId,
        JSON.stringify(attachmentsHashMap, null, 2),
      );
    }

    return attachmentsHashMap;
  }
}

// src/main/java/org/apache/dubbo/remoting/exchange/support/header/HeaderExchangeHandler.java
//com.alibaba.dubbo.remoting.exchange.codec.ExchangeCodec
//encodeRequest
export class DubboResponseEncoder {
  private readonly _ctx: ResponseContext;

  constructor(ctx: ResponseContext) {
    this._ctx = ctx;
  }

  encode() {
    const body = this.encodeBody();
    const head = this.encodeHead(body.length);
    return Buffer.concat([head, body]);
  }

  encodeHead(payload: number) {
    const header = Buffer.alloc(DUBBO_HEADER_LENGTH);
    // set magic number
    header[0] = DUBBO_MAGIC_HIGH;
    header[1] = DUBBO_MAGIC_LOW;

    // set request and serialization flag.
    header[2] = HESSIAN2_SERIALIZATION_ID;

    // set response status
    header[3] = this._ctx.status;

    //set requestId
    const reqIdBuf = toBytes8(this._ctx.request.requestId);
    header[4] = reqIdBuf[0];
    header[5] = reqIdBuf[1];
    header[6] = reqIdBuf[2];
    header[7] = reqIdBuf[3];
    header[8] = reqIdBuf[4];
    header[9] = reqIdBuf[5];
    header[10] = reqIdBuf[6];
    header[11] = reqIdBuf[7];

    header.writeUInt32BE(payload, 12);
    return header;
  }

  encodeBody() {
    const encoder = new Hessian.EncoderV2();

    // response error
    if (this._ctx.status === ResponseStatus.OK) {
      const isSupportAttachment = Version.isSupportResponseAttachment(
        this._ctx.request.version,
      );
      if (this._ctx.body.err) {
        encoder.write(
          isSupportAttachment
            ? DUBBO_RESPONSE_BODY_FLAG.RESPONSE_WITH_EXCEPTION_WITH_ATTACHMENTS
            : DUBBO_RESPONSE_BODY_FLAG.RESPONSE_WITH_EXCEPTION,
        );
        encoder.write(this._ctx.body.err.message);
      } else {
        if (this._ctx.body.res === null) {
          encoder.write(
            isSupportAttachment
              ? DUBBO_RESPONSE_BODY_FLAG.RESPONSE_NULL_VALUE_WITH_ATTACHMENTS
              : DUBBO_RESPONSE_BODY_FLAG.RESPONSE_NULL_VALUE,
          );
        } else {
          encoder.write(
            isSupportAttachment
              ? DUBBO_RESPONSE_BODY_FLAG.RESPONSE_VALUE_WITH_ATTACHMENTS
              : DUBBO_RESPONSE_BODY_FLAG.RESPONSE_VALUE,
          );
          encoder.write(this._ctx.body.res);
        }
      }

      if (isSupportAttachment) {
        const attachments = this._ctx.attachments;
        attachments['dubbo'] = '2.0.2';
        encoder.write(attachments);
      }
    } else {
      encoder.write(this._ctx.body.err.message);
    }

    // check payload length
    checkPayload(encoder.byteBuffer._offset);

    // encode
    return encoder.byteBuffer._bytes.slice(0, encoder.byteBuffer._offset);
  }
}

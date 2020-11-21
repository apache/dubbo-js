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
import {fromBytes8} from '../common/byte';
import {DubboDecodeError} from '../common/err';
import {IDubboResponse} from '../types';
import {
  DEFAULT_DUBBO_PROTOCOL_VERSION,
  DUBBO_RESPONSE_BODY_FLAG,
  DUBBO_RESPONSE_STATUS,
  DUBBO_FLAG_REQUEST,
  DUBBO_FLAG_TWOWAY,
  DUBBO_HEADER_LENGTH,
  HESSIAN2_SERIALIZATION_CONTENT_ID,
  DUBBO_FLAG_EVENT,
} from './constants';
import Request from './request';

const log = debug('dubbo:hessian:DecoderV2');

export function decodeDubboRequest(buff: Buffer): Request {
  const flag = buff[2];
  // get requestId
  const requestId = fromBytes8(buff.slice(4, 12));
  log('decode requestId -> ', requestId);
  const req = new Request(requestId);

  // decode request
  if ((flag & DUBBO_FLAG_REQUEST) !== 0) {
    req.version = DEFAULT_DUBBO_PROTOCOL_VERSION;
    req.twoWay = (flag & DUBBO_FLAG_TWOWAY) !== 0;
    if ((flag & DUBBO_FLAG_EVENT) !== 0) {
      req.event = true;
    }

    const decoder = new Hessian.DecoderV2(buff.slice(DUBBO_HEADER_LENGTH));

    if (req.event) {
      // decode event
    } else {
      // decode request
      const dubboVersion = decoder.read();
      req.version = dubboVersion;

      const attachments = new Map();
      const path = decoder.read();
      const version = decoder.read();
      const methodName = decoder.read();
      const desc = decoder.read();
    }
    // const dubboInterface = body.read();
    // const version = body.read();
    // const methodName = body.read();
    // const parameterTypes: string = body.read();
    // const len: number = parameterTypes.split(';').filter(Boolean).length;
    // const args: Array<any> = [];
    // for (let i = 0; i < len; i++) {
    //   args.push(body.read());
    // }
    // const attachments = body.read();

    // req = {
    //   requestId,
    //   twoWay,
    //   dubboVersion,
    //   dubboInterface,
    //   version,
    //   methodName,
    //   parameterTypes,
    //   args,
    //   attachments,
    // };
  }

  return req;
}

//com.alibaba.dubbo.remoting.exchange.codec.ExchangeCodec.encodeResponse/decode
export function decodeDubboResponse<T>(bytes: Buffer): IDubboResponse<T> {
  let res = null;
  let err = null;
  let attachments = {};

  // set request and serialization flag.
  //字节位置[4-11] 8 bytes
  const requestIdBuff = bytes.slice(4, 12);
  const requestId = fromBytes8(requestIdBuff);
  log(`decode parse requestId: ${requestId}`);

  const typeId = bytes[2];

  if (typeId !== HESSIAN2_SERIALIZATION_CONTENT_ID) {
    return {
      err: new DubboDecodeError(`only support hessian serialization`),
      res: null,
      attachments,
      requestId,
    };
  }

  // get response status.
  const status = bytes[3];

  log(
    `parse response status: ${status}, DUBBO_RESPONSE_STATUS: ${
      DUBBO_RESPONSE_STATUS[DUBBO_RESPONSE_STATUS.OK]
    }`,
  );

  if (status != DUBBO_RESPONSE_STATUS.OK) {
    return {
      err: new DubboDecodeError(bytes.slice(DUBBO_HEADER_LENGTH).toString()),
      res: null,
      attachments,
      requestId,
    };
  }

  //com.alibaba.dubbo.rpc.protocol.dubbo.DecodeableRpcResult
  const body = new Hessian.DecoderV2(bytes.slice(DUBBO_HEADER_LENGTH));
  const flag = body.readInt();

  log(
    `parse dubbo response body flag: ${flag}, DUBBO_RESPONSE_BODY_FLAG: ${
      DUBBO_RESPONSE_BODY_FLAG[flag]
    }`,
  );

  switch (flag) {
    case DUBBO_RESPONSE_BODY_FLAG.RESPONSE_VALUE:
      err = null;
      res = body.read();
      attachments = {};
      break;
    case DUBBO_RESPONSE_BODY_FLAG.RESPONSE_NULL_VALUE:
      err = null;
      res = null;
      attachments = {};
      break;
    case DUBBO_RESPONSE_BODY_FLAG.RESPONSE_WITH_EXCEPTION:
      const exception = body.read();
      err =
        exception instanceof Error
          ? exception
          : new DubboDecodeError(exception);
      res = null;
      attachments = {};
      break;
    case DUBBO_RESPONSE_BODY_FLAG.RESPONSE_NULL_VALUE_WITH_ATTACHMENTS:
      err = null;
      res = null;
      attachments = body.read();
      break;
    case DUBBO_RESPONSE_BODY_FLAG.RESPONSE_VALUE_WITH_ATTACHMENTS:
      err = null;
      res = body.read();
      attachments = body.read();
      break;
    case DUBBO_RESPONSE_BODY_FLAG.RESPONSE_WITH_EXCEPTION_WITH_ATTACHMENTS:
      const exp = body.read();
      err = exp instanceof Error ? exp : new DubboDecodeError(exp);
      res = null;
      attachments = body.read();
      break;
    default:
      err = new DubboDecodeError(
        `Unknown result flag, expect '0/1/2/3/4/5', get  ${flag})`,
      );
      res = null;
  }

  return {
    requestId,
    err,
    res,
    attachments,
  };
}

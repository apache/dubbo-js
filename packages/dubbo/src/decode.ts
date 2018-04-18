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
import {convertBinaryNum} from './binary';
import {IDubboResponse} from './types';
import {DubboDecodeError} from './err';

const log = debug('dubbo:hessian:DecoderV2');

//dubbo response header length
const HEADER_LENGTH = 16;

//com.alibaba.dubbo.remoting.exchange.Response
enum DUBBO_RESPONSE_STATUS {
  OK = 20,
  CLIENT_TIMEOUT = 30,
  SERVER_TIMEOUT = 31,
  BAD_REQUEST = 40,
  BAD_RESPONSE = 50,
  SERVICE_NOT_FOUND = 60,
  SERVICE_ERROR = 70,
  SERVER_ERROR = 80,
  CLIENT_ERROR = 90,
}

//body response status
enum DUBBO_RESPONSE_BODY_FLAG {
  RESPONSE_WITH_EXCEPTION = 0,
  RESPONSE_VALUE = 1,
  RESPONSE_NULL_VALUE = 2,
}

//com.alibaba.dubbo.remoting.exchange.codec.ExchangeCodec.encodeResponse/decode
export function decode<T>(bytes: Buffer): IDubboResponse<T> {
  let res = null;
  let err = null;

  // set request and serialization flag.
  const requestIdBuff = Buffer.alloc(8);
  requestIdBuff[0] = bytes[4];
  requestIdBuff[1] = bytes[5];
  requestIdBuff[2] = bytes[6];
  requestIdBuff[3] = bytes[7];
  requestIdBuff[4] = bytes[8];
  requestIdBuff[5] = bytes[9];
  requestIdBuff[6] = bytes[10];
  requestIdBuff[7] = bytes[11];

  const requestId = convertBinaryNum(requestIdBuff, 8);
  log(`decode parse requestId: ${requestId}`);

  // const typeId = bytes[2];

  // get response status.
  const status = bytes[3];

  log(
    `parse response status: ${status}, DUBBO_RESPONSE_STATUS: ${
      DUBBO_RESPONSE_STATUS[DUBBO_RESPONSE_STATUS.OK]
    }`,
  );

  if (status != DUBBO_RESPONSE_STATUS.OK) {
    return {
      err: new DubboDecodeError(bytes.slice(HEADER_LENGTH).toString()),
      res: null,
      requestId,
    };
  }

  //com.alibaba.dubbo.rpc.protocol.dubbo.DecodeableRpcResult
  const body = new Hessian.DecoderV2(bytes.slice(HEADER_LENGTH));
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
      break;
    case DUBBO_RESPONSE_BODY_FLAG.RESPONSE_NULL_VALUE:
      err = null;
      res = null;
      break;
    case DUBBO_RESPONSE_BODY_FLAG.RESPONSE_WITH_EXCEPTION:
      const exception = body.read();
      err =
        exception instanceof Error
          ? exception
          : new DubboDecodeError(exception);
      res = null;
      break;
    default:
      err = new DubboDecodeError(
        `Unknown result flag, expect '0' '1' '2', get  ${flag})`,
      );
      res = null;
  }

  return {
    requestId,
    err,
    res,
  };
}

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

const log = debug('dubbo:heartbeat');

//dubbo的序列化协议
//com.alibaba.dubbo.remoting.exchange.codec.ExchangeCodec
//encodeRequest

//header length
const DUBBO_HEADER_LENGTH = 16;
// magic header.
const DUBBO_MAGIC_HEADER = 0xdabb;
// message flag.
const FLAG_REQUEST = 0x80;
const FLAG_TWOWAY = 0x40;
const FLAG_EVENT = 0x20;

//com.alibaba.dubbo.common.serialize.support.hessian.Hessian2Serialization中定义
const HESSIAN2_SERIALIZATION_CONTENT_ID = 2;

export default class HeartBeat {
  static encode(): Buffer {
    log('encode heartbeat');

    const buffer = Buffer.alloc(DUBBO_HEADER_LENGTH + 1);

    //magic header
    buffer[0] = DUBBO_MAGIC_HEADER >>> 8;
    buffer[1] = DUBBO_MAGIC_HEADER & 0xff;

    // set request and serialization flag.
    buffer[2] =
      FLAG_REQUEST |
      HESSIAN2_SERIALIZATION_CONTENT_ID |
      FLAG_TWOWAY |
      FLAG_EVENT;

    //set request id
    //暂时不设置

    //set body length
    buffer[15] = 1;

    //body new Hessian.EncoderV2().write(null);
    buffer[16] = 0x4e;

    return buffer;
  }

  //com.alibaba.dubbo.remoting.exchange.codec.ExchangeCodec.decodeBody
  static isHeartBeat(buf) {
    //获取标记位
    const flag = buf[2];
    return (flag & FLAG_EVENT) !== 0;
  }
}

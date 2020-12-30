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

import {EventEmitter} from 'events';
import ip from 'ip';
import {IHessianType, ITrace} from '../types';

const pid = process.pid;
const ipAddr = ip.address();

export const msg = new EventEmitter();
export const noop = () => {};
export const isDevEnv = process.env.NODE_ENV !== 'production';

/**
 * check param is hessian type
 * @param param
 */
export function checkHessianParam(param: any): param is IHessianType {
  return (
    typeof param === 'object' &&
    typeof param['$class'] !== 'undefined' &&
    typeof param['$'] !== 'undefined'
  );
}

/**
 * trace log
 * @param info
 */
export const trace = (obj: ITrace) => {
  setImmediate(() => {
    msg.emit('sys:trace', {
      ...{
        time: new Date().toISOString(),
        pid,
        host: ipAddr,
      },
      ...obj,
    });
  });
};

export const traceInfo = (info: string) => {
  trace({type: 'INFO', msg: info});
};

export const traceErr = (err: Error) => {
  trace({type: 'ERR', msg: err});
};

export const eqSet = <T = any>(as: Set<T>, bs: Set<T>): boolean => {
  //equal size?
  if (as.size !== bs.size) {
    return false;
  }

  //different element
  for (var a of as) {
    if (!bs.has(a)) {
      return false;
    }
  }

  //same
  return true;
};

export const delay = (timeout: number) => {
  return new Promise(resolve => {
    setTimeout(resolve, timeout);
  });
};

/**
 * Dubbo Version
 */
export class Version {
  private static version2Int = new Map<string, number>();
  static LEGACY_DUBBO_PROTOCOL_VERSION = 10000;
  static LOWEST_VERSION_FOR_RESPONSE_ATTACHMENT = 2000200; // 2.0.2
  static HIGHEST_PROTOCOL_VERSION = 2009900; // 2.0.99

  static isSupportResponseAttachment(version: string) {
    if (!version) {
      return false;
    }
    const v = Version.getIntVersion(version);
    if (
      v >= Version.LOWEST_VERSION_FOR_RESPONSE_ATTACHMENT &&
      v <= Version.HIGHEST_PROTOCOL_VERSION
    ) {
      return true;
    }

    return false;
  }

  static getIntVersion(version: string) {
    let v = Version.version2Int.get(version);
    if (!v) {
      try {
        v = Version.parseInt(version);
        if (version.split('.').length == 3) {
          v = v * 100;
        }
      } catch (err) {
        console.error(
          'Please make sure your version value has the right format: ' +
            '\n 1. only contains digital number: 2.0.0; \n 2. with string suffix: 2.6.7-stable. ' +
            '\nIf you are using Dubbo before v2.6.2, the version value is the same with the jar version.',
        );
        v = this.LEGACY_DUBBO_PROTOCOL_VERSION;
      }
      this.version2Int.set(version, v);
    }
    return v;
  }

  static parseInt(version: string) {
    let v = 0;
    const vArr = version.split('.');
    const len = vArr.length;
    for (let i = 0; i < len; i++) {
      const subv = Version.getPrefixDigits(vArr[i]);
      if (subv) {
        v += parseInt(subv) * Math.pow(10, (len - i - 1) * 2);
      }
    }
    return v;
  }

  static getPrefixDigits(v: string): string {
    const match = v.match(/^([0-9]*).*/);
    return match ? match[1] : '';
  }
}

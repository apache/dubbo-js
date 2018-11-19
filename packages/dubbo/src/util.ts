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
import {ITrace} from './types';

const pid = process.pid;
const ipAddr = ip.address();

export const msg = new EventEmitter();

export const isDevEnv = process.env.NODE_ENV !== 'production';

/**
 * yes, just do nothing.
 */
export const noop = () => {};

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

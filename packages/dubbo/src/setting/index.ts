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
import {isArray} from 'util';
import {isFn, isRegExp, isString} from './type';
import {IDubboSetting, IRule, TPredictFunction} from './types';

const log = debug('dubbo:dubbo-setting');

/**
 * Matcher
 * 多么想要一个ReasonML的match-pattern 😆
 */
export class Matcher {
  private readonly _rules: Array<IRule> = [];
  private _cache: Map<string, IDubboSetting> = new Map();

  /**
   * 匹配规则
   * 规则的有限级别 string > string[] > fn > regexp
   * @param arg
   * @param dubboSetting
   */
  match(
    arg: string | Array<string> | RegExp | TPredictFunction,
    dubboSetting?: IDubboSetting,
  ) {
    //build rule
    const rule = {
      condition: arg,
      dubboSetting,
    };

    log('add match rule %j', rule);

    this._rules.push(rule);
    return this;
  }

  getDubboSetting(dubboInterface: string) {
    //get from cache
    if (this._cache.has(dubboInterface)) {
      return this._cache.get(dubboInterface);
    }

    //no cache
    for (let rule of this._rules) {
      const {condition, dubboSetting} = rule;

      //dubboInterface == condition
      if (isString(condition) && dubboInterface === condition) {
        log(
          '%s =match=> string rule %s result=> %j',
          dubboInterface,
          condition,
          dubboSetting,
        );

        //cache
        this._cache.set(dubboInterface, dubboSetting);
        return dubboSetting;
      }

      if (isArray(condition) && condition.includes(dubboInterface)) {
        log('%s =match=> Array rule result=> %j', dubboInterface, dubboSetting);
        //cache
        this._cache.set(dubboInterface, dubboSetting);
        return dubboSetting;
      }

      //isFn return value is true
      if (isFn(condition) && condition(dubboInterface)) {
        log('%s =match=> fn rule result=> %j', dubboInterface);
        const dubboSetting = condition(dubboInterface);
        //cache it
        this._cache.set(dubboInterface, dubboSetting);
        return dubboSetting;
      }

      //dubboInteface match regexp
      if (isRegExp(condition) && condition.test(dubboInterface)) {
        log(
          '%s =match=> regexp rule %O result=> %j',
          dubboInterface,
          condition,
          dubboSetting,
        );
        //cache it
        this._cache.set(dubboInterface, dubboSetting);
        return dubboSetting;
      }
    }

    log('oops, %s can not find any match rule', dubboInterface);
    return null;
  }
}

export default new Matcher();

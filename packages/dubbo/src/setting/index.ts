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
import {isArray, isFn, isRegExp, isString} from './type';
import {IDubboSetting, IRule, TPredictFunction} from './types';

const log = debug('dubbo:dubbo-setting');

/**
 * Matcher
 * 多么想要一个ReasonML的match-pattern 😆
 */
export class Setting {
  private readonly _rules: Map<string, Array<IRule>> = new Map()
    .set('Array', new Array<IRule>())
    .set('RegExp', new Array<IRule>())
    .set('TPredictFunction', new Array<IRule>());
  private _cache: Map<string, IDubboSetting> = new Map();

  /**
   * 匹配规则
   * 规则的有限级别 string[] > fn > regexp
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
    if (isString(arg)) {
      rule.condition = [arg];
      this._rules.get('Array').push(rule);
    } else if (isArray(arg)) {
      this._rules.get('Array').push(rule);
    } else if (isFn(arg)) {
      this._rules.get('TPredictFunction').push(rule);
    } else if (isRegExp(arg)) {
      this._rules.get('RegExp').push(rule);
    }
    return this;
  }

  getDubboSetting(dubboInterface: string) {
    //get from cache
    if (this._cache.has(dubboInterface)) {
      return this._cache.get(dubboInterface);
    }
    let matchedRule = null;
    if (!matchedRule) {
      for (let rule of this._rules.get('Array')) {
        if (
          isArray(rule.condition) &&
          rule.condition.indexOf(dubboInterface) !== -1
        ) {
          matchedRule = rule;
          break;
        }
      }
    }
    if (!matchedRule) {
      for (let rule of this._rules.get('TPredictFunction')) {
        if (isFn(rule.condition) && rule.condition(dubboInterface)) {
          rule.dubboSetting = rule.condition(dubboInterface);
          matchedRule = rule;
          break;
        }
      }
    }

    if (!matchedRule) {
      for (let rule of this._rules.get('RegExp')) {
        if (isRegExp(rule.condition) && rule.condition.test(dubboInterface)) {
          matchedRule = rule;
          break;
        }
      }
    }
    if (matchedRule) {
      log(
        '%s =match=> rule %s result=> %j',
        dubboInterface,
        matchedRule.condition,
        matchedRule.dubboSetting,
      );
      this._cache.set(dubboInterface, matchedRule.dubboSetting);
      return matchedRule.dubboSetting;
    }
    log('oops, %s can not find any match rule', dubboInterface);
    return null;
  }
}

export default new Setting();

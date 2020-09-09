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

import async_hooks from 'async_hooks';
import debug from 'debug';
const log = debug('dubbo:zone');

//alias type
export type AsyncId = number;
export type RootAsyncId = number;

/**
 * ZoneContext 期待Zone的规范早日落地
 */
export class ZoneContext {
  constructor() {
    log('init ZoneContext');
    this.rootMap = new Map();
    this.statckFrameMap = new Map();
    this.initAsyncHook();
  }

  private rootMap: Map<AsyncId, object>;
  private statckFrameMap: Map<AsyncId, RootAsyncId>;

  /**
   * 初始化async_hooks
   */
  initAsyncHook() {
    log('init async hooks');
    const self = this;
    const {rootMap, statckFrameMap} = this;

    //@ts-ignore
    const cleanUpContextNode = (id: AsyncId, type: string) => {
      if (!self.statckFrameMap.has(id)) {
        // (process as any)._rawDebug(`no id ${id}`);
        return;
      }

      // (process as any)._rawDebug(`${type}: ${id}`);
      //获取当前销毁asyncId对应的rootId
      const rootId = statckFrameMap.get(id);

      //销毁当前的栈数据
      statckFrameMap.delete(id);

      //判断当前的stackFrameMap还有对于rootId的引用
      let existsRootRef = false;
      //@ts-ignore
      for (let [_, v] of self.statckFrameMap) {
        if (v === rootId) {
          existsRootRef = true;
          break;
        }
      }
      //如果不存在rootId的引用,销毁rootMap的引用
      if (!existsRootRef) {
        rootMap.delete(rootId);
      }

      // (process as any)._rawDebug(statckFrameMap);
      // (process as any)._rawDebug(rootMap);
    };

    async_hooks
      .createHook({
        //@ts-ignore
        init(asyncId, type, triggerAsyncId, resource) {
          // (process as any)._rawDebug(Array.from(arguments).join('|>'));

          //如果当前的triggerAsyncId是rootContext,直接将rootAsyncId关联起来，这样可以省点内存(避免对象的拷贝复制)
          //如果当前的triggerAsyncId是stackContext,将父的rootAsyncId关联起来
          if (rootMap.has(triggerAsyncId)) {
            statckFrameMap.set(asyncId, triggerAsyncId);
          } else {
            if (statckFrameMap.has(triggerAsyncId)) {
              statckFrameMap.set(asyncId, statckFrameMap.get(triggerAsyncId));
            }
          }
        },

        destroy(id) {
          cleanUpContextNode(id, 'destroy');
        },

        promiseResolve(id) {
          cleanUpContextNode(id, 'resolve');
        },

        after(id) {
          cleanUpContextNode(id, 'after');
        },
      })
      .enable();
  }

  /**
   * 获取zonecontext值策略:
   * 1. 找出当前async-resource 有context的async-resources集合;
   * 2. 按就近原则, 遍历async-resources集合对应的context;
   * 3. 如果context包含key值则返回,如果不包含key值,则继续;
   *
   * @param key
   * @returns {any}
   */
  get(key: string): any | undefined {
    let asyncId = async_hooks.executionAsyncId();

    let ids = this.getRootAsyncIdLinks(asyncId);
    let value = undefined;
    for (let i = 0, iLen = ids.length; i < iLen; i++) {
      let contextMap = this.rootMap.get(ids[i]);
      if (contextMap[key]) {
        value = contextMap[key];
        break;
      }
    }

    log(`current currentAsyncId ${asyncId} value:${JSON.stringify(value)}`);
    return value;
  }

  /**
   * 获取调用链上的有Context的async resourec
   *
   * @param {AsyncId} asyncId
   * @returns {AsyncId[]}
   */
  private getRootAsyncIdLinks(asyncId: AsyncId): AsyncId[] {
    let ids: AsyncId[] = [];

    do {
      if (this.rootMap.has(asyncId)) {
        ids.push(asyncId);
      }
      asyncId = this.statckFrameMap.get(asyncId);
    } while (asyncId);

    return ids;
  }

  setRootContext(key, value) {
    log('set:', key, value);

    const rootId = async_hooks.executionAsyncId();
    if (this.rootMap.has(rootId)) {
      const obj = this.rootMap.get(rootId);
      this.rootMap.set(rootId, Object.assign({}, obj, {[key]: value}));
    } else {
      this.rootMap.set(rootId, {[key]: value});
    }

    log(this.rootMap);
  }
}

export default new ZoneContext();

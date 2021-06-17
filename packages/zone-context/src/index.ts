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

import asyncHook from 'async_hooks'
import fs from 'fs'
import path from 'path'

export interface IRoot {
  [key: string]: Object
}

export interface ITree {
  [key: string]: {
    rootId: number
    pid: number
    children: Array<number>
  }
}

// root context
const root: IRoot = {}

/**
 * tree invoke context data-structure
 *
 * {
 * '6': { pid: -1, children: [ 8, 9 ] },
 * '8': { pid: 6, children: [] },
 * '9': { pid: 6, children: [ 14 ] },
 * '14': { pid: 9, children: [ 15 ] },
 * '15': { pid: 14,children: [ 16 ] },
 * '16': { pid: 15, children: [ 17 ] },
 * '17': { pid: 16, children: [] }
 * }
 *
 */
const invokeTree: ITree = {}

// enabel async hook
asyncHook
  .createHook({
    // @ts-ignore
    init(asyncId, type, triggerAsyncId) {
      // debugFile(`${asyncId} - ${type} - ${triggerAsyncId}`, 'hook.debug.log')
      // 不记录一步的文件操作
      if (type === 'FSREQCALLBACK') {
        return
      }
      // debugFile(`${type}-${asyncId}-${triggerAsyncId}`)
      const parent = invokeTree[triggerAsyncId]
      if (parent) {
        invokeTree[asyncId] = {
          pid: triggerAsyncId,
          rootId: parent.rootId,
          children: []
        }
        invokeTree[triggerAsyncId].children.push(asyncId)
      }
    }
  })
  .enable()

// find root value
function findRootVal(asyncId: number) {
  const node = invokeTree[asyncId]
  return node ? root[node.rootId] : null
}

/**
 * 回收 tree node
 * @param rootId
 */
function gc(rootId: number) {
  // 如果不存在该 rootId
  if (!root[rootId]) {
    return
  }

  const collectionAllNodeId = (rootId: number) => {
    const { children } = invokeTree[rootId]
    let allNodeId = [...children]
    for (let id of children) {
      allNodeId = [...allNodeId, ...collectionAllNodeId(id)]
    }
    return allNodeId
  }

  const allNodes = collectionAllNodeId(rootId)
  for (let id of allNodes) {
    delete invokeTree[id]
  }
  delete invokeTree[rootId]
  delete root[rootId]
}

export function debugFile(arg: any, file: string = 'tls.debug.log') {
  fs.writeFileSync(path.join(process.cwd(), file), `${arg}\n`, {
    flag: 'a'
  })
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ public api ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/**
 * ZoneContext
 * @param fn
 */
export async function ZoneContext(fn: Function) {
  const asyncResource = new asyncHook.AsyncResource('ZoneContext')
  let rootId = -1
  // @ts-ignore
  return asyncResource.runInAsyncScope(async () => {
    try {
      rootId = asyncHook.executionAsyncId()
      root[rootId] = {}
      invokeTree[rootId] = {
        pid: -1,
        rootId,
        children: []
      }
      await fn()
    } finally {
      // destroy tree
      gc(rootId)
    }
  })
}

export function getZoneContext() {
  const curId = asyncHook.executionAsyncId()
  return findRootVal(curId)
}

export function setZoneContext(obj: Object) {
  const curId = asyncHook.executionAsyncId()
  let root = findRootVal(curId)
  Object.assign(root, obj)
}

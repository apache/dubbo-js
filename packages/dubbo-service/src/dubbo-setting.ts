import { util } from '@apache/dubbo-common'
import {
  IDubboServiceSetting,
  TDubboServiceInterface,
  TDubboServiceShortName,
  TMatchThunk
} from './types'

export class DubboSetting {
  private matchDubboInterface: Map<TDubboServiceInterface, IDubboServiceSetting>
  private matchDubboRegx: Map<RegExp, IDubboServiceSetting>
  private matchDubboThunk: Set<TMatchThunk>

  constructor() {
    this.matchDubboInterface = new Map()
    this.matchDubboRegx = new Map()
    this.matchDubboThunk = new Set()
  }

  match(
    rule: TDubboServiceInterface | Array<TDubboServiceInterface> | RegExp,
    meta: IDubboServiceSetting
  ) {
    if (util.isString(rule)) {
      this.matchDubboInterface.set(rule, meta)
    } else if (util.isArray(rule)) {
      rule.forEach((r) => this.matchDubboInterface.set(r, meta))
    } else if (rule instanceof RegExp) {
      this.matchDubboRegx.set(rule, meta)
    }
    return this
  }

  matchThunk(thunk: TMatchThunk) {
    this.matchDubboThunk.add(thunk)
    return this
  }

  getDubboSetting({
    dubboServiceShortName,
    dubboServiceInterface
  }: {
    dubboServiceShortName?: TDubboServiceShortName
    dubboServiceInterface?: TDubboServiceInterface
  }) {
    // first, we search thunk
    for (let thunk of this.matchDubboThunk) {
      const meta = thunk(dubboServiceShortName)
      if (meta) {
        return meta
      }
    }

    // second, search from dubboInterface
    if (this.matchDubboInterface.has(dubboServiceInterface)) {
      return this.matchDubboInterface.get(dubboServiceInterface)
    }

    // third, search from regx
    for (let [r, meta] of this.matchDubboRegx) {
      if (r.test(dubboServiceInterface)) {
        return meta
      }
    }

    // no match anything
    return null
  }
}

export const dubboSetting = new DubboSetting()

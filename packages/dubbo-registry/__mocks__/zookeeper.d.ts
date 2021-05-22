/// <reference types="node" />
/// <reference types="zookeeper" />
import EventEmitter from 'events'
import { IZkClientConfig } from '../src/types'
/**
 * mock node_modules/zookeeper
 */
export default class Zoookeeper extends EventEmitter {
  static constants: typeof import('zookeeperConstants')
  props: IZkClientConfig
  isConnectErr: boolean
  constructor(props: IZkClientConfig)
  init(): void
  mkdirp(path: string, cb: Function): void
  mockConnectErr(): void
  create(
    path: string,
    data: string | Buffer,
    isPersistent: boolean,
  ): Promise<void>
  exists(path: string): Promise<never>
  w_get_children(servicePath: string): Promise<string[]>
}

import {EventEmitter} from 'events';

export enum MSG_TYPE {
  SYS_ERR = 'sys:err',
  SYS_READY = 'sys:ready',
  SYS_STATISTICS = 'sys:statistics',
}

export const msg = new EventEmitter();

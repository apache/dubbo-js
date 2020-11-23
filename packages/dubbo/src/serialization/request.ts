import {isBoolean, isString} from 'util';
import {DUBBO_HEART_BEAT_EVENT} from './constants';

//src/main/java/org/apache/dubbo/remoting/exchange/Request.java
export default class Request {
  readonly requestId: number;
  version: string;
  twoWay: boolean;
  _event: boolean;
  broken: boolean;
  data: Object | string;
  methodName: string;
  parameterTypeDesc: string;
  parameterTypes: Array<string>;
  args: Array<any>;
  attachment: Map<string, Object> = new Map();

  constructor(requestId: number) {
    this.requestId = requestId;
  }

  //=========setter && getter=================
  get event() {
    return this.event;
  }

  set event(event: string | boolean) {
    if (isBoolean(event)) {
      this._event = event;
    } else if (isString(event)) {
      this._event = true;
      this.data = event;
    }
  }

  isHeartBeat() {
    return this.event && DUBBO_HEART_BEAT_EVENT === this.data;
  }
}

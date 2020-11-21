// src/main/java/org/apache/dubbo/remoting/exchange/Response.java

import {DUBBO_HEART_BEAT_EVENT} from './constants';

export enum RESPONSE_STATUS {
  OK = 20,
  CLIENT_TIMEOUT = 30,
  SERVER_TIMEOUT = 31,
  BAD_REQUEST = 40,
  BAD_RESPONSE = 50,
  SERVICE_NOT_FOUND = 60,
  SERVICE_ERROR = 70,
  SERVER_ERRO = 80,
  CLIENT_ERRO = 90,
}

export default class Response {
  readonly requestId: number;
  version: string;
  status: number = RESPONSE_STATUS.OK;
  _event: boolean = false;
  errorMsg: string;
  result: Object;

  constructor(id: number) {
    this.requestId = id;
  }

  set event(event: string) {
    this._event = true;
    this.result = event;
  }

  get isHeartbeat() {
    return this._event && DUBBO_HEART_BEAT_EVENT === this.result;
  }

  set heartBeat(isHeartBeat: boolean) {
    if (isHeartBeat) {
      this.event = DUBBO_HEART_BEAT_EVENT;
    }
  }
}

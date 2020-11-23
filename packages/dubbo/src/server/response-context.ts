import Request from '../serialization/request';
import {IDubboResult} from '../types';

export enum ResponseStatus {
  OK = 20,
  BAD_REQUEST = 40,
  BAD_RESPONSE = 50,
  SERVICE_NOT_FOUND = 60,
  SERVER_ERROR = 80,
}

export default class ResponseContext<T = any> {
  private _req: Request;
  private _attachments: Object;
  private _status: number;

  /**
   * 当前dubbo返回的结果
   */
  private _body: IDubboResult<T>;

  constructor(req: Request) {
    this._req = req;
    this._attachments = {};
    this._body = {res: null, err: null};
  }

  get request() {
    return this._req;
  }

  get body() {
    return this._body;
  }

  set body(body: IDubboResult<T>) {
    this._body = body;
  }

  get attachments(): Object {
    return this._attachments;
  }

  set attachments(val: Object) {
    this._attachments = {
      ...this._attachments,
      ...val,
    };
  }

  set status(code: ResponseStatus) {
    this._status = code;
  }

  get status() {
    return this._status;
  }
}

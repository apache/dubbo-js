import * as net from 'net';
import * as debug from 'debug';
import HeartBeat from './heartbeat';
import {SOCKET_STATUS} from './socket-status';
import DubboEncoder from './encode';
import {decode} from './decode';
import {IDubboEncoderProps} from './types';
import DecodeBuffer from './decode-buffer';

let uuid = 0;
const noop = () => {};
const log = debug('dubbo:socket-worker');
const HEART_BEAT = 180 * 1000;

export default class SocketWorker {
  constructor(host: string, port: number) {
    this._pid = ++uuid;
    this._host = host;
    this._port = port;
    this._isSending = false;
    this._retry = 0;
    this._status = SOCKET_STATUS.PADDING;
    this._buff = new DecodeBuffer(this._pid).onData(this._onDecodeData);

    this._onConnectCB = noop;
    this._onCloseCB = noop;
    this._onDataCB = noop;

    log(
      `new SocketWorker#${this._pid} =connecting=> ${this._host}:${this._port}`,
    );

    this._socket = new net.Socket();
    this._socket.connect(port, host, this._onConnected);
    this._socket.on('data', this._onData);
    this._socket.on('error', this._onError);
    this._socket.on('close', this._onClose);
  }

  private _pid: number;
  private _retry: number;
  private _host: string;
  private _port: number;
  private _socket: net.Socket;
  private _isSending: boolean;
  private _status: number;
  private _buff: DecodeBuffer;
  private _onConnectCB: Function;
  private _onCloseCB: Function;
  private _onDataCB: Function;
  private _heartBeatTimer: NodeJS.Timer;

  static from(url: string) {
    const [host, port] = url.split(':');
    return new SocketWorker(host, parseInt(port));
  }

  private _onConnected = () => {
    log(`SocketWorker#${this._pid} <=connected=> ${this._host}:${this._port}`);
    this._status = SOCKET_STATUS.CONNECTED;
    this._socket.setNoDelay(true);

    //通知外部连接成功
    this._onConnectCB({
      pid: this._pid,
      host: this._host,
      port: this._port,
    });

    //心跳
    this._heartBeatTimer = setInterval(() => {
      //如果当前没有正在发送数据包，才发送心跳包
      if (!this._isSending) {
        log('emit heartbeat');
        this._socket.write(HeartBeat.encode());
      }
    }, HEART_BEAT);
  };

  private _onData = data => {
    log(
      `SocketWorker#${this._pid}  =receive data=> ${this._host}:${this._port}`,
    );

    this._buff.receive(data);
  };

  private _onDecodeData = (data: Buffer) => {
    //反序列化dubbo
    const json = decode(data);
    log(
      `SocketWorker#${this._pid} <=received=> dubbo result: ${JSON.stringify(
        json,
        null,
        2,
      )}`,
    );
    this._onDataCB(json);
  };

  private _onError = error => {
    log(
      `SocketWorker#${this._pid} <=occur error=> ${this._host}:${this._port}`,
    );
    log(error);
    clearInterval(this._heartBeatTimer);
  };

  private _onClose = () => {
    log(`SocketWorker#${this._pid} <=closed=> ${this._host}:${this._port}`);
    this._status = SOCKET_STATUS.CLOSED;
    this._onCloseCB({
      pid: this._pid,
      host: this._host,
      port: this._port,
    });
    clearInterval(this._heartBeatTimer);
    this._retry++;
  };

  /**
   * 通知外部连接成功
   */
  onConnect(cb: Function) {
    this._onConnectCB = cb;
    return this;
  }

  /**
   * 通知外部不可用
   */
  onClose(cb) {
    this._onCloseCB = cb;
    return this;
  }

  onData(cb) {
    this._onDataCB = cb;
    return this;
  }

  write(data: IDubboEncoderProps) {
    if (this.status === SOCKET_STATUS.CONNECTED) {
      this._isSending = true;
      const encoder = new DubboEncoder(data);
      this._socket.write(encoder.encode());
      this._isSending = false;
    }
  }

  get status() {
    return this._status;
  }

  get pid() {
    return this._pid;
  }

  get host() {
    return this._host;
  }

  get port() {
    return this._port;
  }
}

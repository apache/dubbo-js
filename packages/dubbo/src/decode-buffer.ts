import * as debug from 'debug';
import HeartBeat from './heartbeat';
import {convertBinaryNum} from './binary';

const noop = () => {};
const MAGIC_HIGH = 0xda;
const MAGIC_LOW = 0xbb;
const HEADER_LENGTH = 16;
const log = debug('dubbo:decode-buffer');

export default class DecodeBuffer {
  constructor(pid: number) {
    log('new DecodeBuffer');
    this._pid = pid;
    this._buffer = Buffer.alloc(0);
    this._onDataCB = noop;
  }

  private _pid: number;
  private _buffer: Buffer;
  private _onDataCB: Function;

  receive(data: Buffer) {
    //concat bytes
    this._buffer = Buffer.concat([this._buffer, data]);
    let bufferLength = this._buffer.length;

    while (bufferLength >= HEADER_LENGTH) {
      //判断buffer 0, 1 是不是dubbo的magic high , magic low
      const magicHigh = this._buffer[0];
      const magicLow = this._buffer[1];

      //TODO 如果不是magichight magiclow 做个容错

      if (magicHigh === MAGIC_HIGH && magicLow === MAGIC_LOW) {
        //数据量还不够头部的长度
        if (bufferLength < HEADER_LENGTH) {
          //waiting
          log('bufferLength < header length');
          return;
        }

        //取出头部字节
        const header = this._buffer.slice(0, HEADER_LENGTH);
        //计算body的长度
        const bodyLengthBuff = Buffer.from([
          header[12],
          header[13],
          header[14],
          header[15],
        ]);
        const bodyLength = convertBinaryNum(bodyLengthBuff, 4);
        log('body length', bodyLength);

        //判断是不是心跳
        if (HeartBeat.isHeartBeat(header)) {
          log(`SocketWorker#${this._pid} <=receive= heartbeat data.`);
          this._buffer = this._buffer.slice(HEADER_LENGTH + bodyLength);
          bufferLength = this._buffer.length;
          return;
        }

        if (HEADER_LENGTH + bodyLength > bufferLength) {
          //waiting
          log('header length + body length > buffer length');
          return;
        }
        const dataBuffer = this._buffer.slice(0, HEADER_LENGTH + bodyLength);
        this._buffer = this._buffer.slice(HEADER_LENGTH + bodyLength);
        bufferLength = this._buffer.length;
        this._onDataCB(dataBuffer);
      }
    }
  }

  onData = cb => {
    this._onDataCB = cb;
    return this;
  };
}

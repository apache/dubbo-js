import * as Hessian from 'hessian.js';
import * as debug from 'debug';
import {IDubboEncoderProps} from './types';
import {binaryNum} from './binary';

const log = debug('dubbo:hessian:encoderV2');

//dubbo的序列化协议
//com.alibaba.dubbo.remoting.exchange.codec.ExchangeCodec
//encodeRequest

//header length
const DUBBO_HEDER_LENGTH = 16;
// magic header.
const DUBBO_MAGIC_HEADER = 0xdabb;
// message flag.
const FLAG_REQUST = 0x80;
const FLAG_TWOWAY = 0x40;

//com.alibaba.dubbo.common.serialize.support.hessian.Hessian2Serialization中定义
const HESSIAN2_SERIALIZATION_CONTENT_ID = 2;

//dubbo最大的body序列化数据的大小
//com.alibaba.dubbo.common.Constants.DEAULT_PAY_LOAD
const DUBBO_DEFAULT_PAY_LOAD = 8 * 1024 * 1024; // 8M

export default class DubboEncoder {
  constructor(props: IDubboEncoderProps) {
    this.props = props;
    log(`dubbo encode param ${JSON.stringify(this.props, null, 2)}`);
  }

  props: IDubboEncoderProps;

  encode() {
    const body = this.encodeBody();
    const head = this.encodeHead(body.length);
    log(`encode body length: ${body.length} bytes`);

    return Buffer.concat([head, body]);
  }

  /**
   * 根据协议，消息中写入16个字节的消息头：
   * 1-2字节，固定的魔数
   * 第3个字节，第7位存储数据类型是请求数据还是响应数据，其它8位存储序列化类型，约定和服务端的序列化-反序列化协议
   * 5-12个字节，请求id
   * 13-16个字节，请求数据长度
   *
   * @param payload body的长度
   */
  private encodeHead(payload: number) {
    //header
    const header = Buffer.alloc(DUBBO_HEDER_LENGTH);

    //set magic number
    //magic high
    header[0] = DUBBO_MAGIC_HEADER >>> 8;
    //magic low
    header[1] = DUBBO_MAGIC_HEADER & 0xff;

    // set request and serialization flag.
    header[2] = FLAG_REQUST | HESSIAN2_SERIALIZATION_CONTENT_ID | FLAG_TWOWAY;

    //requestId
    this.setRequestId(header);

    //check body length
    if (payload > 0 && payload > DUBBO_DEFAULT_PAY_LOAD) {
      throw new Error(
        `Data length too large: ${payload}, max payload: ${DUBBO_DEFAULT_PAY_LOAD}`,
      );
    }

    //body长度int-> 4个byte
    const bodyLengthBuff = binaryNum(payload, 4);
    header[12] = bodyLengthBuff[0];
    header[13] = bodyLengthBuff[1];
    header[14] = bodyLengthBuff[2];
    header[15] = bodyLengthBuff[3];

    return header;
  }

  private setRequestId(header) {
    const requestId = this.props.requestId;
    log(`encode header requestId: ${requestId}`);
    const buffer = binaryNum(requestId, 8);
    header[4] = buffer[0];
    header[5] = buffer[1];
    header[6] = buffer[2];
    header[7] = buffer[3];
    header[8] = buffer[4];
    header[9] = buffer[5];
    header[10] = buffer[6];
    header[11] = buffer[7];
  }

  private encodeBody() {
    //hessian v2
    const encoder = new Hessian.EncoderV2();

    const {
      dubboVersion,
      dubboInterface,
      version,
      methodName,
      methodArgs,
    } = this.props;

    //dubbo version
    encoder.write(dubboVersion);
    //path interface
    encoder.write(dubboInterface);
    //interface version
    encoder.write(version);
    //method name
    encoder.write(methodName);
    //parameter types
    encoder.write(DubboEncoder.getParameterTypes(methodArgs));

    //arguments
    if (methodArgs && methodArgs.length) {
      for (let arg of methodArgs) {
        encoder.write(arg);
      }
    }

    //attachments
    encoder.write(this.getAttachments());

    return encoder.byteBuffer._bytes.slice(0, encoder.byteBuffer._offset);
  }

  private static getParameterTypes(args: Array<any>) {
    if (!(args && args.length)) {
      return '';
    }

    const primitiveTypeRef = {
      void: 'V',
      boolean: 'Z',
      byte: 'B',
      char: 'C',
      double: 'D',
      float: 'F',
      int: 'I',
      long: 'J',
      short: 'S',
    };

    const desc = [];

    for (let arg of args) {
      let type: string = arg['$class'];

      //暂时不支持二维数组
      //如果将来支持，这个地方要while判断下
      if (type[0] === '[') {
        //1. c is array
        desc.push('[');
        type = type.slice(1);
      }

      if (primitiveTypeRef[type]) {
        //2. c is primitive
        desc.push(primitiveTypeRef[type]);
      } else {
        //3. c is object
        desc.push('L');
        desc.push(type.replace(/\./gi, '/'));
        desc.push(';');
      }
    }

    return desc.join('');
  }

  private getAttachments() {
    const {dubboInterface, group, timeout, version} = this.props;

    let attachments = {
      $class: 'java.util.HashMap',
      $: {
        interface: dubboInterface,
        path: dubboInterface,
        version: '0.0.0',
      },
    };

    group && (attachments['group'] = group);
    timeout && (attachments['timeout'] = timeout);
    version && (attachments['version'] = version);

    return attachments;
  }
}

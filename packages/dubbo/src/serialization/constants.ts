// magic header.
export const DUBBO_MAGIC_HEADER = 0xdabb;
export const DUBBO_MAGIC_HIGH = 0xda;
export const DUBBO_MAGIC_LOW = 0xbb;
//dubbo response header length
export const DUBBO_HEADER_LENGTH = 16;
export const DEFAULT_DUBBO_PROTOCOL_VERSION = '2.0.2';

export const HESSIAN2_SERIALIZATION_ID = 2;
//com.alibaba.dubbo.common.serialize.support.hessian.Hessian2Serialization
export const HESSIAN2_SERIALIZATION_CONTENT_ID = 2;
//max dubbo response payload length
//com.alibaba.dubbo.common.Constants.DEAULT_PAY_LOAD
export const DUBBO_DEFAULT_PAY_LOAD = 8 * 1024 * 1024; // 8M

// message flag
export const DUBBO_FLAG_REQUEST = 0x80;
export const DUBBO_FLAG_TWOWAY = 0x40;
export const DUBBO_FLAG_EVENT = 0x20;

// event
export const DUBBO_HEART_BEAT_EVENT = null;

//com.alibaba.dubbo.remoting.exchange.Response
export enum DUBBO_RESPONSE_STATUS {
  OK = 20,
  CLIENT_TIMEOUT = 30,
  SERVER_TIMEOUT = 31,
  BAD_REQUEST = 40,
  BAD_RESPONSE = 50,
  SERVICE_NOT_FOUND = 60,
  SERVICE_ERROR = 70,
  SERVER_ERROR = 80,
  CLIENT_ERROR = 90,
}

//body response status
export enum DUBBO_RESPONSE_BODY_FLAG {
  RESPONSE_WITH_EXCEPTION = 0,
  RESPONSE_VALUE = 1,
  RESPONSE_NULL_VALUE = 2,
  //@since dubbo2.6.3
  RESPONSE_WITH_EXCEPTION_WITH_ATTACHMENTS = 3,
  RESPONSE_VALUE_WITH_ATTACHMENTS = 4,
  RESPONSE_NULL_VALUE_WITH_ATTACHMENTS = 5,
}

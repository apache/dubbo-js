import { IRequestContext, IResponseContext } from './types'

/**
 * define dubbo decode interface
 */
export interface DubboDecoder {
  decodeDubboRequest(buf: Buffer): void
  decodeDubboResponse(buf: Buffer): void
}

/**
 * define dubbo encode interface
 */
export interface DubboEncoder {
  encodeDubboRequest(ctx: IRequestContext): Buffer
  encodeDubboResponse(ctx: IResponseContext): Buffer
}

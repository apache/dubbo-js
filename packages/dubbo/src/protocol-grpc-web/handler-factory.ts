// Copyright 2021-2023 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type { Message } from '@bufbuild/protobuf'
import { DubboError } from '../dubbo-error.js'
import { Code } from '../code.js'
import type { MethodImplSpec } from '../implementation.js'
import { createHandlerContext } from '../implementation.js'
import { createTrailerSerialization, trailerFlag } from './trailer.js'
import {
  headerAcceptEncoding,
  headerContentType,
  headerEncoding,
  headerGrpcStatus,
  headerTimeout
} from './headers.js'
import {
  contentTypeJson,
  contentTypeProto,
  contentTypeRegExp,
  parseContentType
} from './content-type.js'
import { parseTimeout } from '../protocol-grpc/parse-timeout.js'
import {
  grpcStatusOk,
  setTrailerStatus
} from '../protocol-grpc/trailer-status.js'
import {
  pipe,
  transformPrepend,
  transformSplitEnvelope,
  transformDecompressEnvelope,
  transformParseEnvelope,
  transformSerializeEnvelope,
  transformCatchFinally,
  transformCompressEnvelope,
  transformJoinEnvelopes,
  untilFirst
} from '../protocol/async-iterable.js'
import { compressionNegotiate } from '../protocol/compression.js'
import { contentTypeMatcher } from '../protocol/content-type-matcher.js'
import { createMethodUrl } from '../protocol/create-method-url.js'
import type { EnvelopedMessage } from '../protocol/envelope.js'
import { transformInvokeImplementation } from '../protocol/invoke-implementation.js'
import type { ProtocolHandlerFactory } from '../protocol/protocol-handler-factory.js'
import {
  type Serialization,
  createMethodSerializationLookup
} from '../protocol/serialization.js'
import {
  type UniversalHandlerOptions,
  validateUniversalHandlerOptions
} from '../protocol/universal-handler.js'
import {
  type UniversalServerRequest,
  type UniversalServerResponse,
  assertByteStreamRequest,
  uResponseUnsupportedMediaType,
  uResponseMethodNotAllowed,
  uResponseOk
} from '../protocol/universal.js'

const protocolName = 'grpc-web'
const methodPost = 'POST'

/**
 * Create a factory that creates gRPC-web handlers.
 */
export function createHandlerFactory(
  options: Partial<UniversalHandlerOptions>
): ProtocolHandlerFactory {
  const opt = validateUniversalHandlerOptions(options)
  const trailerSerialization = createTrailerSerialization()

  function fact(spec: MethodImplSpec) {
    const h = createHandler(opt, trailerSerialization, spec)
    return Object.assign(h, {
      protocolNames: [protocolName],
      allowedMethods: [methodPost],
      supportedContentType: contentTypeMatcher(contentTypeRegExp),
      requestPath: createMethodUrl('/', spec.service, spec.method),
      service: spec.service,
      method: spec.method
    })
  }

  fact.protocolName = protocolName
  return fact
}

function createHandler<I extends Message<I>, O extends Message<O>>(
  opt: UniversalHandlerOptions,
  trailerSerialization: Serialization<Headers>,
  spec: MethodImplSpec<I, O>
) {
  const serialization = createMethodSerializationLookup(
    spec.method,
    opt.binaryOptions,
    opt.jsonOptions,
    opt
  )
  return async function handle(
    req: UniversalServerRequest
  ): Promise<UniversalServerResponse> {
    assertByteStreamRequest(req)
    const type = parseContentType(req.header.get(headerContentType))
    if (type == undefined || type.text) {
      return uResponseUnsupportedMediaType
    }
    if (req.method !== methodPost) {
      return uResponseMethodNotAllowed
    }
    const timeout = parseTimeout(
      req.header.get(headerTimeout),
      opt.maxTimeoutMs
    )
    const context = createHandlerContext({
      ...spec,
      requestMethod: req.method,
      protocolName,
      timeoutMs: timeout.timeoutMs,
      shutdownSignal: opt.shutdownSignal,
      requestSignal: req.signal,
      requestHeader: req.header,
      responseHeader: {
        [headerContentType]: type.binary ? contentTypeProto : contentTypeJson
      },
      responseTrailer: {
        [headerGrpcStatus]: grpcStatusOk
      }
    })
    const compression = compressionNegotiate(
      opt.acceptCompression,
      req.header.get(headerEncoding),
      req.header.get(headerAcceptEncoding),
      headerAcceptEncoding
    )
    if (compression.response) {
      context.responseHeader.set(headerEncoding, compression.response.name)
    }
    const outputIt = pipe(
      req.body,
      transformPrepend<Uint8Array>(() => {
        // raise compression error to serialize it as a trailer status
        if (compression.error) throw compression.error
        // raise timeout parsing error to serialize it as a trailer status
        if (timeout.error) throw timeout.error
        return undefined
      }),
      transformSplitEnvelope(opt.readMaxBytes),
      transformDecompressEnvelope(compression.request, opt.readMaxBytes),
      transformParseEnvelope(
        serialization.getI(type.binary),
        trailerFlag
        // if we set `null` here, an end-stream-message in the request
        // raises an error, but we want to be lenient
      ),
      transformInvokeImplementation<I, O>(spec, context),
      transformSerializeEnvelope(serialization.getO(type.binary)),
      transformCatchFinally<EnvelopedMessage>((e) => {
        context.abort()
        if (e instanceof DubboError) {
          setTrailerStatus(context.responseTrailer, e)
        } else if (e !== undefined) {
          setTrailerStatus(
            context.responseTrailer,
            new DubboError(
              'internal error',
              Code.Internal,
              undefined,
              undefined,
              e
            )
          )
        }
        return {
          flags: trailerFlag,
          data: trailerSerialization.serialize(context.responseTrailer)
        }
      }),
      transformCompressEnvelope(compression.response, opt.compressMinBytes),
      transformJoinEnvelopes()
    )
    return {
      ...uResponseOk,
      // We wait for the first response body bytes before resolving, so that
      // implementations have a chance to add headers before an adapter commits
      // them to the wire.
      body: await untilFirst(outputIt),
      header: context.responseHeader
    }
  }
}

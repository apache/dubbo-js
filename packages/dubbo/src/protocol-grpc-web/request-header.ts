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

import {
  headerAcceptEncoding,
  headerContentType,
  headerEncoding,
  headerTimeout,
  headerXUserAgent,
  headerXGrpcWeb
} from './headers.js'
import { contentTypeJson, contentTypeProto } from './content-type.js'
import type { Compression } from '../protocol/compression.js'

/**
 * Creates headers for a gRPC-web request.
 *
 * @private Internal code, does not follow semantic versioning.
 */
export function requestHeader(
  useBinaryFormat: boolean,
  timeoutMs: number | undefined,
  userProvidedHeaders: HeadersInit | undefined
): Headers {
  const result = new Headers(userProvidedHeaders ?? {})
  // Note that we do not support the grpc-web-text format.
  // https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md#protocol-differences-vs-grpc-over-http2
  result.set(
    headerContentType,
    useBinaryFormat ? contentTypeProto : contentTypeJson
  )
  result.set(headerXGrpcWeb, '1')
  // Note that we do not comply with recommended structure for the
  // user-agent string.
  // https://github.com/grpc/grpc/blob/c462bb8d485fc1434ecfae438823ca8d14cf3154/doc/PROTOCOL-HTTP2.md#user-agents
  result.set(headerXUserAgent, '@apachedubbo/dubbo-web')
  if (timeoutMs !== undefined) {
    result.set(headerTimeout, `${timeoutMs}m`)
  }
  return result
}

/**
 * Creates headers for a gRPC-web request with compression.
 *
 * @private Internal code, does not follow semantic versioning.
 */
export function requestHeaderWithCompression(
  useBinaryFormat: boolean,
  timeoutMs: number | undefined,
  userProvidedHeaders: HeadersInit | undefined,
  acceptCompression: Compression[],
  sendCompression: Compression | null
): Headers {
  const result = requestHeader(useBinaryFormat, timeoutMs, userProvidedHeaders)
  if (sendCompression != null) {
    result.set(headerEncoding, sendCompression.name)
  }
  if (acceptCompression.length > 0) {
    result.set(
      headerAcceptEncoding,
      acceptCompression.map((c) => c.name).join(',')
    )
  }
  return result
}

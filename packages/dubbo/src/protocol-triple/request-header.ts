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

import { MethodKind } from '@bufbuild/protobuf'
import {
  headerContentType,
  headerStreamAcceptEncoding,
  headerStreamEncoding,
  headerUnaryAcceptEncoding,
  headerUnaryEncoding,
  headerTimeout,
  headerProtocolVersion,
  headerServiceVersion,
  headerServiceGroup
} from './headers.js'
import { protocolVersion } from './version.js'
import {
  contentTypeStreamJson,
  contentTypeStreamProto,
  contentTypeUnaryJson,
  contentTypeUnaryProto
} from './content-type.js'
import type { Compression } from '../protocol/compression.js'
import type { TripleClientServiceOptions } from './client-service-options.js'

/**
 * Creates headers for a Dubbo request.
 *
 * @private Internal code, does not follow semantic versioning.
 */
export function requestHeader(
  methodKind: MethodKind,
  useBinaryFormat: boolean,
  timeoutMs: number | undefined,
  userProvidedHeaders: HeadersInit | undefined,
  serviceOptions?: TripleClientServiceOptions
): Headers {
  const result = new Headers(userProvidedHeaders ?? {})
  if (timeoutMs !== undefined) {
    result.set(headerTimeout, `${timeoutMs}`)
  }
  result.set(
    headerContentType,
    methodKind == MethodKind.Unary
      ? useBinaryFormat
        ? contentTypeUnaryProto
        : contentTypeUnaryJson
      : useBinaryFormat
      ? contentTypeStreamProto
      : contentTypeStreamJson
  )
  result.set(headerProtocolVersion, protocolVersion)
  if (serviceOptions?.serviceGroup !== undefined) {
    result.set(headerServiceGroup, serviceOptions.serviceGroup)
  }
  if (serviceOptions?.serviceVersion !== undefined) {
    result.set(headerServiceVersion, serviceOptions.serviceVersion)
  }
  return result
}

/**
 * Creates headers for a Connect request with compression.
 *
 * Note that we always set the Content-Encoding header for unary methods.
 * It is up to the caller to decide whether to apply compression - and remove
 * the header if compression is not used, for example because the payload is
 * too small to make compression effective.
 *
 * @private Internal code, does not follow semantic versioning.
 */
export function requestHeaderWithCompression(
  methodKind: MethodKind,
  useBinaryFormat: boolean,
  timeoutMs: number | undefined,
  userProvidedHeaders: HeadersInit | undefined,
  acceptCompression: Compression[],
  sendCompression: Compression | null,
  serviceOptions?: TripleClientServiceOptions
): Headers {
  const result = requestHeader(
    methodKind,
    useBinaryFormat,
    timeoutMs,
    userProvidedHeaders,
    serviceOptions
  )
  if (sendCompression != null) {
    const name =
      methodKind == MethodKind.Unary
        ? headerUnaryEncoding
        : headerStreamEncoding
    result.set(name, sendCompression.name)
  }
  if (acceptCompression.length > 0) {
    const name =
      methodKind == MethodKind.Unary
        ? headerUnaryAcceptEncoding
        : headerStreamAcceptEncoding
    result.set(name, acceptCompression.map((c) => c.name).join(','))
  }
  return result
}

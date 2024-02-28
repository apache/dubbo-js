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

import { Message, protoBase64 } from '@bufbuild/protobuf'
import type { AnyMessage } from '@bufbuild/protobuf'
import {
  headerContentType,
  headerProtocolVersion,
  headerUnaryAcceptEncoding,
  headerUnaryContentLength,
  headerUnaryEncoding
} from './headers.js'
import { protocolVersion } from './version.js'
import type { UnaryRequest } from '../interceptor.js'

const contentTypePrefix = 'application/'

function encodeMessageForUrl(message: Uint8Array, useBase64: boolean): string {
  if (useBase64) {
    // TODO(jchadwick-buf): Three regex replaces seems excessive.
    // Can we make protoBase64.enc more flexible?
    return protoBase64
      .enc(message)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  } else {
    return encodeURIComponent(new TextDecoder().decode(message))
  }
}

/**
 * @private Internal code, does not follow semantic versioning.
 */
export function transformConnectPostToGetRequest<
  I extends Message<I> = AnyMessage,
  O extends Message<O> = AnyMessage
>(
  request: UnaryRequest<I, O>,
  message: Uint8Array,
  useBase64: boolean
): UnaryRequest<I, O> {
  let query = `?triple=v${protocolVersion}`
  const contentType = request.header.get(headerContentType)
  if (contentType?.indexOf(contentTypePrefix) === 0) {
    query +=
      '&encoding=' +
      encodeURIComponent(contentType.slice(contentTypePrefix.length))
  }
  const compression = request.header.get(headerUnaryEncoding)
  if (compression !== null && compression !== 'identity') {
    query += '&compression=' + encodeURIComponent(compression)

    // Force base64 for compressed payloads.
    useBase64 = true
  }
  if (useBase64) {
    query += '&base64=1'
  }
  query += '&message=' + encodeMessageForUrl(message, useBase64)
  const url = request.url + query

  // Omit headers that are not used for unary GET requests.
  const header = new Headers(request.header)
  header.delete(headerProtocolVersion)
  header.delete(headerContentType)
  header.delete(headerUnaryContentLength)
  header.delete(headerUnaryEncoding)
  header.delete(headerUnaryAcceptEncoding)

  return {
    ...request,
    init: {
      ...request.init,
      method: 'GET'
    },
    url,
    header
  }
}

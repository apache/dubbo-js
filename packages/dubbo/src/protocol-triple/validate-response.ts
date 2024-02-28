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
import { Code } from '../code.js'
import { codeFromHttpStatus } from './http-status.js'
import { DubboError } from '../dubbo-error.js'
import { headerStreamEncoding, headerUnaryEncoding } from './headers.js'
import type { Compression } from '../protocol/compression.js'

/**
 * Validates response status and header for the Connect protocol.
 * Throws a DubboError if the header indicates an error, or if
 * the content type is unexpected, with the following exception:
 * For unary RPCs with an HTTP error status, this returns an error
 * derived from the HTTP status instead of throwing it, giving an
 * implementation a chance to parse a Connect error from the wire.
 *
 * @private Internal code, does not follow semantic versioning.
 */
export function validateResponse(
  methodKind: MethodKind,
  status: number,
  headers: Headers
):
  | { isUnaryError: false; unaryError?: undefined }
  | { isUnaryError: true; unaryError: DubboError } {
  if (status !== 200) {
    const errorFromStatus = new DubboError(
      `HTTP ${status}`,
      codeFromHttpStatus(status),
      headers
    )
    if (methodKind == MethodKind.Unary) {
      return { isUnaryError: true, unaryError: errorFromStatus }
    }
    throw errorFromStatus
  }
  return { isUnaryError: false }
}

/**
 * Validates response status and header for the Connect protocol.
 * This function is identical to validateResponse(), but also verifies
 * that a given encoding header is acceptable.
 *
 * @private
 */
export function validateResponseWithCompression(
  methodKind: MethodKind,
  acceptCompression: Compression[],
  status: number,
  headers: Headers
): ReturnType<typeof validateResponse> & {
  compression: Compression | undefined
} {
  let compression: Compression | undefined
  const encoding = headers.get(
    methodKind == MethodKind.Unary ? headerUnaryEncoding : headerStreamEncoding
  )
  if (encoding != null && encoding.toLowerCase() !== 'identity') {
    compression = acceptCompression.find((c) => c.name === encoding)
    if (!compression) {
      throw new DubboError(
        `unsupported response encoding "${encoding}"`,
        Code.InvalidArgument,
        headers
      )
    }
  }
  return {
    compression,
    ...validateResponse(methodKind, status, headers)
  }
}

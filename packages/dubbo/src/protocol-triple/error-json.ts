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
import type {
  JsonObject,
  JsonValue,
  JsonWriteOptions
} from '@bufbuild/protobuf'
import { Code } from '../code.js'
import { DubboError } from '../dubbo-error.js'

/**
 * Parse a Connect error from a JSON value.
 * Will return a DubboError, and throw the provided fallback if parsing failed.
 *
 * @private Internal code, does not follow semantic versioning.
 */
export function errorFromJson(
  jsonValue: JsonValue,
  metadata: HeadersInit | undefined,
  fallback: DubboError
): DubboError {
  if (metadata) {
    new Headers(metadata).forEach((value, key) =>
      fallback.metadata.append(key, value)
    )
  }
  if (
    typeof jsonValue !== 'object' ||
    jsonValue == null ||
    Array.isArray(jsonValue) ||
    !('status' in jsonValue) ||
    typeof jsonValue.status !== 'number'
  ) {
    throw fallback
  }
  const code = jsonValue.status
  if (code === undefined || !(code in Code)) {
    throw fallback
  }
  const message = jsonValue.message
  if (message != null && typeof message !== 'string') {
    throw fallback
  }
  const error = new DubboError(message ?? '', code, metadata)
  if ('details' in jsonValue && Array.isArray(jsonValue.details)) {
    for (const detail of jsonValue.details) {
      if (
        detail === null ||
        typeof detail != 'object' ||
        Array.isArray(detail) ||
        typeof detail.type != 'string' ||
        typeof detail.value != 'string' ||
        ('debug' in detail && typeof detail.debug != 'object')
      ) {
        throw fallback
      }
      try {
        error.details.push({
          type: detail.type,
          value: protoBase64.dec(detail.value),
          debug: detail.debug
        })
      } catch (e) {
        throw fallback
      }
    }
  }
  return error
}

/**
 * Parse a Connect error from a serialized JSON value.
 * Will return a DubboError, and throw the provided fallback if parsing failed.
 *
 * @private Internal code, does not follow semantic versioning.
 */
export function errorFromJsonBytes(
  bytes: Uint8Array,
  metadata: HeadersInit | undefined,
  fallback: DubboError
): DubboError {
  let jsonValue: JsonValue
  try {
    jsonValue = JSON.parse(new TextDecoder().decode(bytes)) as JsonValue
  } catch (e) {
    throw fallback
  }
  return errorFromJson(jsonValue, metadata, fallback)
}

/**
 * Serialize the given error to JSON.
 *
 * The JSON serialization options are required to produce the optional
 * human-readable representation in the "debug" key if the detail uses
 * google.protobuf.Any. If serialization of the "debug" value fails, it
 * is silently disregarded.
 *
 * See https://cn.dubbo.apache.org/zh-cn/overview/reference/protocols/triple-spec/
 *
 * @private Internal code, does not follow semantic versioning.
 */
export function errorToJson(
  error: DubboError,
  jsonWriteOptions: Partial<JsonWriteOptions> | undefined
): JsonObject {
  const o: JsonObject = {
    status: error.code
  }
  if (error.rawMessage.length > 0) {
    o.message = error.rawMessage
  }
  if (error.details.length > 0) {
    type IncomingDetail = {
      type: string
      value: Uint8Array
      debug?: JsonValue
    }
    o.details = error.details
      .map((value) => {
        if (value instanceof Message) {
          const i: IncomingDetail = {
            type: value.getType().typeName,
            value: value.toBinary()
          }
          try {
            i.debug = value.toJson(jsonWriteOptions)
          } catch (e) {
            // We deliberately ignore errors that may occur when serializing
            // a message to JSON (the message contains an Any).
            // The rationale is that we are only trying to provide optional
            // debug information.
          }
          return i
        }
        return value
      })
      .map(({ value, ...rest }) => ({
        ...rest,
        value: protoBase64.enc(value)
      }))
  }
  return o
}

/**
 * Serialize the given error to JSON. This calls errorToJson(), but stringifies
 * the result, and converts it into a UInt8Array.
 *
 * @private Internal code, does not follow semantic versioning.
 */
export function errorToJsonBytes(
  error: DubboError,
  jsonWriteOptions: Partial<JsonWriteOptions> | undefined
): Uint8Array {
  const textEncoder = new TextEncoder()
  try {
    const jsonObject = errorToJson(error, jsonWriteOptions)
    const jsonString = JSON.stringify(jsonObject)
    return textEncoder.encode(jsonString)
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    throw new DubboError(
      `failed to serialize Connect Error: ${m}`,
      Code.Internal
    )
  }
}

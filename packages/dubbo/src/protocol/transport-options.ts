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

import type {
  BinaryReadOptions,
  BinaryWriteOptions,
  JsonReadOptions,
  JsonWriteOptions
} from '@bufbuild/protobuf'
import type { UniversalClientFn } from './universal.js'
import type { Interceptor } from '../interceptor.js'
import type { Compression } from './compression.js'

/**
 * @private Internal code, does not follow semantic versioning.
 */
export interface CommonTransportOptions {
  /**
   * The HTTP client to use.
   */
  httpClient: UniversalClientFn

  /**
   * Base URI for all HTTP requests.
   *
   * Requests will be made to <baseUrl>/<package>.<service>/method
   *
   * Example: `baseUrl: "https://example.com/my-api"`
   *
   * This will make a `POST /my-api/my_package.MyService/Foo` to
   * `example.com` via HTTPS.
   */
  baseUrl: string

  /**
   * By default, clients use the binary format for gRPC-web, because
   * not all gRPC-web implementations support JSON.
   */
  useBinaryFormat: boolean

  /**
   * Interceptors that should be applied to all calls running through
   * this transport. See the Interceptor type for details.
   */
  interceptors: Interceptor[]

  /**
   * Options for the JSON format.
   * By default, unknown fields are ignored.
   */
  jsonOptions?: Partial<JsonReadOptions & JsonWriteOptions>

  /**
   * Options for the binary wire format.
   */
  binaryOptions?: Partial<BinaryReadOptions & BinaryWriteOptions>

  /**
   * Compression algorithms available to a client. Clients ask servers to
   * compress responses using any of the registered algorithms. The first
   * registered algorithm is the most preferred.
   *
   * It is safe to use this option liberally: servers will ignore any
   * compression algorithms they don't support. To compress requests, pair this
   * option with `sendCompression`.
   *
   * If this option is not provided, the compression algorithms "gzip" and "br"
   * (Brotli) are accepted. To opt out of response compression, pass an
   * empty array.
   */
  acceptCompression: Compression[]

  /**
   * Configures the client to use the specified algorithm to compress request
   * messages.
   *
   * Because some servers don't support compression, clients default to sending
   * uncompressed requests.
   */
  sendCompression: Compression | null

  /**
   * Sets a minimum size threshold for compression: Messages that are smaller
   * than the configured minimum are sent uncompressed.
   *
   * The default value is 1 kibibyte, because the CPU cost of compressing very
   * small messages usually isn't worth the small reduction in network I/O.
   */
  compressMinBytes: number

  /**
   * Limits the performance impact of pathologically large messages sent by the
   * server. Limits apply to each individual message, not to the stream as a
   * whole.
   *
   * The default limit is the maximum supported value of ~4GiB.
   */
  readMaxBytes: number

  /**
   * Prevents sending messages too large for the server to handle.
   *
   * The default limit is the maximum supported value of ~4GiB.
   */
  writeMaxBytes: number

  /**
   * Controls whether or not Connect GET requests should be used when
   * available, on side-effect free methods. Defaults to false.
   */
  useHttpGet?: boolean
}

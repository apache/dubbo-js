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

import * as triple from './protocol-triple/headers.js'
import * as grpc from './protocol-grpc/headers.js'
import * as grpcWeb from './protocol-grpc-web/headers.js'

/**
 * CORS prevents rogue scripts in a web browser from making arbitrary requests
 * to other web servers.
 *
 * This object provides helpful constants to configure CORS middleware for
 * cross-domain requests with the protocols supported by Triple.
 *
 * Make sure to add application-specific headers that your application
 * uses as well.
 *
 * Mainly used for testing of dubbo-node-test
 */
export const cors = {
  /**
   * Request methods that scripts running in the browser are permitted to use.
   *
   * To support cross-domain requests with the protocols supported by Triple,
   * these headers fields must be included in the preflight response header
   * Access-Control-Allow-Methods.
   */
  allowedMethods: ['POST', 'GET'] as ReadonlyArray<string>,

  /**
   * Header fields that scripts running in the browser are permitted to send.
   *
   * To support cross-domain requests with the protocols supported by Triple,
   * these field names must be included in the preflight response header
   * Access-Control-Allow-Headers.
   *
   * Make sure to include any application-specific headers your browser client
   * may send.
   */
  allowedHeaders: [
    triple.headerContentType,
    triple.headerProtocolVersion,
    triple.headerTimeout,
    triple.headerServiceVersion,
    triple.headerServiceGroup,
    triple.headerStreamEncoding, // Unused in web browsers, but added for future-proofing
    triple.headerStreamAcceptEncoding, // Unused in web browsers, but added for future-proofing
    triple.headerUnaryEncoding, // Unused in web browsers, but added for future-proofing
    triple.headerUnaryAcceptEncoding, // Unused in web browsers, but added for future-proofing
    grpc.headerMessageType, // Unused in web browsers, but added for future-proofing
    grpcWeb.headerXGrpcWeb,
    grpcWeb.headerXUserAgent,
    grpcWeb.headerTimeout
  ] as ReadonlyArray<string>,

  /**
   * Header fields that scripts running the browser are permitted to see.
   *
   * To support cross-domain requests with the protocols supported by Triple,
   * these field names must be included in header Access-Control-Expose-Headers
   * of the actual response.
   *
   * Make sure to include any application-specific headers your browser client
   * should see. If your application uses trailers, they will be sent as header
   * fields with a `Trailer-` prefix for Triple unary RPCs - make sure to
   * expose them as well if you want them to be visible in all supported
   * protocols.
   */
  exposedHeaders: [
    grpcWeb.headerGrpcStatus, // Crucial for gRPC-web
    grpcWeb.headerGrpcMessage, // Crucial for gRPC-web
    grpcWeb.headerStatusDetailsBin, // Error details in gRPC, gRPC-web
    triple.headerUnaryEncoding, // Unused in web browsers, but added for future-proofing
    triple.headerStreamEncoding // Unused in web browsers, but added for future-proofing
  ] as ReadonlyArray<string>
}

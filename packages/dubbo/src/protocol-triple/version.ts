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

import { headerProtocolVersion } from "./headers.js";
import { paramConnectVersion } from "./query-params.js";
import { DubboError } from "../dubbo-error.js";
import { Code } from "../code.js";

/**
 * The only know value for the header TRI-Protocol-Version.
 *
 * @private Internal code, does not follow semantic versioning.
 */
export const protocolVersion = "1.0.0";

/**
 * Requires the TRI-Protocol-Version header to be present with the expected
 * value. Raises a DubboError with Code.InvalidArgument otherwise.
 *
 * @private Internal code, does not follow semantic versioning.
 */
export function requireProtocolVersionHeader(requestHeader: Headers) {
  const v = requestHeader.get(headerProtocolVersion);
  if (v === null) {
    throw new DubboError(
      `missing required header: set ${headerProtocolVersion} to "${protocolVersion}"`,
      Code.InvalidArgument
    );
  } else if (v !== protocolVersion) {
    throw new DubboError(
      `${headerProtocolVersion} must be "${protocolVersion}": got "${v}"`,
      Code.InvalidArgument
    );
  }
}

/**
 * Requires the connect query parameter to be present with the expected value.
 * Raises a DubboError with Code.InvalidArgument otherwise.
 *
 * @private Internal code, does not follow semantic versioning.
 */
export function requireProtocolVersionParam(queryParams: URLSearchParams) {
  const v = queryParams.get(paramConnectVersion);
  if (v === null) {
    throw new DubboError(
      `missing required parameter: set ${paramConnectVersion} to "v${protocolVersion}"`,
      Code.InvalidArgument
    );
  } else if (v !== `v${protocolVersion}`) {
    throw new DubboError(
      `${paramConnectVersion} must be "v${protocolVersion}": got "${v}"`,
      Code.InvalidArgument
    );
  }
}

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

import { validateResponse } from './validate-response.js'
import { DubboError } from '../dubbo-error.js'

describe('gRPC-web validateResponse()', function () {
  function v(
    httpStatus: number,
    headers: Record<string, string>
  ): DubboError | undefined {
    try {
      validateResponse(httpStatus, new Headers(headers))
      return undefined
    } catch (e) {
      if (e instanceof DubboError) {
        return e
      }
      throw e
    }
  }

  it('should disregard Content-Type', function () {
    const e = v(200, { 'Content-Type': 'application/csv' })
    expect(e).toBeUndefined()
  })

  for (let status = 200; status < 300; status++) {
    it(`should treat HTTP ${status} as in protocol`, function () {
      const e = v(status, {
        'grpc-status': '8',
        'grpc-message': 'out of space'
      })
      expect(e?.message).toBe('[resource_exhausted] out of space')
    })
  }

  it('should honor grpc-status field', function () {
    const e = v(200, { 'grpc-status': '8', 'grpc-message': 'out of space' })
    expect(e?.message).toBe('[resource_exhausted] out of space')
  })

  it('should include headers as error metadata with grpc-status', function () {
    const e = v(200, { 'grpc-status': '8', Foo: 'Bar' })
    expect(e?.metadata.get('Foo')).toBe('Bar')
  })

  it('should honor HTTP error code', function () {
    const e = v(429, {})
    expect(e?.message).toBe('[unavailable] HTTP 429')
  })

  it('should include headers as error metadata with HTTP error code', function () {
    const e = v(429, { Foo: 'Bar' })
    expect(e?.metadata.get('Foo')).toBe('Bar')
  })

  it('should prefer HTTP error code over grpc-status field', function () {
    const e = v(401, { 'grpc-status': '8', 'grpc-message': 'out of space' })
    expect(e?.message).toBe('[unauthenticated] out of space')
  })

  it('should use grpc-message even with a HTTP error code', function () {
    const e = v(401, { 'grpc-status': '8', 'grpc-message': 'out of space' })
    expect(e?.message).toBe('[unauthenticated] out of space')
  })

  it('should return foundStatus for grpc-status OK', function () {
    const { foundStatus } = validateResponse(
      200,
      new Headers({ 'grpc-status': '0' })
    )
    expect(foundStatus).toBeTrue()
  })
})

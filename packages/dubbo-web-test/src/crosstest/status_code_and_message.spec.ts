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
  DubboError,
  createCallbackClient,
  createPromiseClient,
  Code
} from '@apachedubbo/dubbo'
import { TestService } from '../gen/grpc/testing/test_dubbo.js'
import { describeTransports } from '../helpers/crosstestserver.js'
import { SimpleRequest } from '../gen/grpc/testing/messages_pb.js'

describe('status_code_and_message', function () {
  describeTransports((transport) => {
    const TEST_STATUS_MESSAGE = 'test status message'
    const request = new SimpleRequest({
      responseStatus: {
        code: Code.Unknown,
        message: TEST_STATUS_MESSAGE
      }
    })
    function expectError(err: unknown) {
      expect(err).toBeInstanceOf(DubboError)
      if (err instanceof DubboError) {
        expect(err.code).toEqual(Code.Unknown)
        expect(err.rawMessage).toEqual(TEST_STATUS_MESSAGE)
      }
    }
    it('with promise client', async function () {
      const client = createPromiseClient(TestService, transport())
      try {
        await client.unaryCall(request)
        fail('expected to catch an error')
      } catch (e) {
        expectError(e)
      }
    })
    it('with callback client', function (done) {
      const client = createCallbackClient(TestService, transport())
      client.unaryCall(request, (err: DubboError | undefined) => {
        expectError(err)
        done()
      })
    })
  })
})

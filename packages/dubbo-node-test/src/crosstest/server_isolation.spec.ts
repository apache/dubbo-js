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

import { Code, DubboError, createPromiseClient } from "apache-dubbo";
import type { TripleClientServiceOptions } from 'apache-dubbo/protocol-triple';
import { TestService } from "../gen/grpc/testing/test_dubbo.js";
import { Empty } from "../gen/grpc/testing/empty_pb.js";
import { createTestServers } from "../helpers/testserver.js";


describe("server_isolation", function () {
  const servers = createTestServers();
  beforeAll(async () => await servers.start());

  const tripleOption: TripleClientServiceOptions = { serviceGroup: 'dubbo', serviceVersion: '1.0.0' };
  const tripleOptionErrorGroup: TripleClientServiceOptions = { serviceGroup: 'dobbu', serviceVersion: '1.0.0' };
  const tripleOptionErrorVersion: TripleClientServiceOptions = { serviceGroup: 'dubbo', serviceVersion: '1.0.1' };
  const tripleOptionLossGroup: TripleClientServiceOptions = { serviceVersion: '1.0.0' };
  const tripleOptionLossVersion: TripleClientServiceOptions = { serviceGroup: 'dubbo' };

  function expectError(err: unknown) {
    expect(err).toBeInstanceOf(DubboError);
    if (err instanceof DubboError) {
      expect(err.code).toEqual(Code.Unimplemented);
      expect(err.rawMessage).toBe("HTTP 404");
    }
  }

  servers.describeTransportsWithIsolation((transport) => {
    const empty = new Empty();
    describe("with promise client", function () {
      it("correct triple option", async function () {
        const client = createPromiseClient(TestService, transport(), tripleOption);
        const response = await client.emptyCall(empty);
        expect(response).toEqual(empty);
      });
      it("triple option with error group", async function () {
        const client = createPromiseClient(TestService, transport(), tripleOptionErrorGroup);
        try {
          await client.emptyCall(empty);
          fail("expected to catch an error");
        }  catch (e) {
          expectError(e);
        }
      });
      it("triple option with error version", async function () {
        const client = createPromiseClient(TestService, transport(), tripleOptionErrorVersion);
        try {
          await client.emptyCall(empty);
          fail("expected to catch an error");
        }  catch (e) {
          expectError(e);
        }
      });
      it("triple option with loss group", async function () {
        const client = createPromiseClient(TestService, transport(), tripleOptionLossGroup);
        try {
          await client.emptyCall(empty);
          fail("expected to catch an error");
        }  catch (e) {
          expectError(e);
        }
      });
      it("triple option with loss version", async function () {
        const client = createPromiseClient(TestService, transport(), tripleOptionLossVersion);
        try {
          await client.emptyCall(empty);
          fail("expected to catch an error");
        }  catch (e) {
          expectError(e);
        }
      });
    });
  });

  afterAll(async () => await servers.stop());
});

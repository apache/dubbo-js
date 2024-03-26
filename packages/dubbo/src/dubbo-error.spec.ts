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
  BoolValue,
  createRegistry,
  Message,
  proto3,
  ScalarType,
  Struct
} from '@bufbuild/protobuf'
import {
  DubboError,
  dubboErrorDetails,
  dubboErrorFromReason
} from './dubbo-error.js'
import { Code } from './code.js'
import { node16FetchHeadersPolyfill } from './node16-polyfill-helper.spec.js'

node16FetchHeadersPolyfill()

describe('DubboError', () => {
  describe('constructor', () => {
    it('should have status unknown by default', () => {
      const e = new DubboError('foo')
      expect(e.code).toBe(Code.Unknown)
      expect(e.message).toBe('[unknown] foo')
      expect(e.rawMessage).toBe('foo')
      expect(String(e)).toBe('DubboError: [unknown] foo')
    })
    it('should take other status', () => {
      const e = new DubboError('foo', Code.AlreadyExists)
      expect(e.code).toBe(Code.AlreadyExists)
      expect(e.message).toBe('[already_exists] foo')
      expect(e.rawMessage).toBe('foo')
      expect(String(e)).toBe('DubboError: [already_exists] foo')
    })
    it('accepts metadata', () => {
      const e = new DubboError('foo', Code.AlreadyExists, { foo: 'bar' })
      expect(e.metadata.get('foo')).toBe('bar')
    })
  })
  describe('findDetails()', function () {
    type ErrorDetail = Message<ErrorDetail> & {
      reason: string
      domain: string
    }
    const ErrorDetail = proto3.makeMessageType<ErrorDetail>(
      'handwritten.ErrorDetail',
      [
        { no: 1, name: 'reason', kind: 'scalar', T: ScalarType.STRING },
        { no: 2, name: 'domain', kind: 'scalar', T: ScalarType.STRING }
      ]
    )
    describe('on error without details', () => {
      const err = new DubboError('foo')
      it('with empty TypeRegistry produces no details', () => {
        const details = err.findDetails(createRegistry())
        expect(details.length).toBe(0)
      })
      it('with non-empty TypeRegistry produces no details', () => {
        const details = err.findDetails(createRegistry(ErrorDetail))
        expect(details.length).toBe(0)
      })
      it('with MessageType produces no details', () => {
        const details = err.findDetails(ErrorDetail)
        expect(details.length).toBe(0)
      })
    })
    describe('on error with Any details', () => {
      const err = new DubboError('foo')
      err.details.push(
        new ErrorDetail({
          reason: 'soirée 🎉',
          domain: 'example.com'
        })
      )
      it('with empty TypeRegistry produces no details', () => {
        const details = err.findDetails(createRegistry())
        expect(details.length).toBe(0)
      })
      it('with non-empty TypeRegistry produces detail', () => {
        const details = err.findDetails(createRegistry(ErrorDetail))
        expect(details.length).toBe(1)
      })
      it('with MessageType produces detail', () => {
        const details = err.findDetails(ErrorDetail)
        expect(details.length).toBe(1)
        if (details[0] instanceof ErrorDetail) {
          expect(details[0].domain).toBe('example.com')
          expect(details[0].reason).toBe('soirée 🎉')
        } else {
          fail()
        }
      })
      it('with multiple MessageTypes produces detail', () => {
        const details = err.findDetails(
          createRegistry(Struct, ErrorDetail, BoolValue)
        )
        expect(details.length).toBe(1)
        expect(details[0]).toBeInstanceOf(ErrorDetail)
      })
    })
  })
  describe('from()', () => {
    it('accepts DubboError as unknown', () => {
      const error: unknown = new DubboError(
        'Not permitted',
        Code.PermissionDenied
      )
      const got = DubboError.from(error)
      expect(got as unknown).toBe(error)
      expect(got.code).toBe(Code.PermissionDenied)
      expect(got.rawMessage).toBe('Not permitted')
    })
    it('accepts any Error', () => {
      const error: unknown = new Error('Not permitted')
      const got = DubboError.from(error)
      expect(got as unknown).not.toBe(error)
      expect(got.code).toBe(Code.Unknown)
      expect(got.rawMessage).toBe('Not permitted')
    })
    it('accepts string value', () => {
      const error: unknown = 'Not permitted'
      const got = DubboError.from(error)
      expect(got.code).toBe(Code.Unknown)
      expect(got.rawMessage).toBe('Not permitted')
    })
  })
})

describe('dubboErrorDetails()', () => {
  type ErrorDetail = Message<ErrorDetail> & {
    reason: string
    domain: string
  }
  const ErrorDetail = proto3.makeMessageType<ErrorDetail>(
    'handwritten.ErrorDetail',
    [
      { no: 1, name: 'reason', kind: 'scalar', T: ScalarType.STRING },
      { no: 2, name: 'domain', kind: 'scalar', T: ScalarType.STRING }
    ]
  )
  describe('on error without details', () => {
    const err = new DubboError('foo')
    it('with empty TypeRegistry produces no details', () => {
      const details = dubboErrorDetails(err, createRegistry())
      expect(details.length).toBe(0)
    })
    it('with non-empty TypeRegistry produces no details', () => {
      const details = dubboErrorDetails(err, createRegistry(ErrorDetail))
      expect(details.length).toBe(0)
    })
    it('with MessageType produces no details', () => {
      const details = dubboErrorDetails(err, ErrorDetail)
      expect(details.length).toBe(0)
    })
  })
  describe('on error with Any details', () => {
    const err = new DubboError('foo')
    err.details.push(
      new ErrorDetail({
        reason: 'soirée 🎉',
        domain: 'example.com'
      })
    )
    it('with empty TypeRegistry produces no details', () => {
      const details = dubboErrorDetails(err, createRegistry())
      expect(details.length).toBe(0)
    })
    it('with non-empty TypeRegistry produces detail', () => {
      const details = dubboErrorDetails(err, createRegistry(ErrorDetail))
      expect(details.length).toBe(1)
    })
    it('with MessageType produces detail', () => {
      const details = dubboErrorDetails(err, ErrorDetail)
      expect(details.length).toBe(1)
      if (details[0] instanceof ErrorDetail) {
        expect(details[0].domain).toBe('example.com')
        expect(details[0].reason).toBe('soirée 🎉')
      } else {
        fail()
      }
    })
    it('with multiple MessageTypes produces detail', () => {
      const details = dubboErrorDetails(err, Struct, ErrorDetail, BoolValue)
      expect(details.length).toBe(1)
      expect(details[0]).toBeInstanceOf(ErrorDetail)
    })
  })
})

describe('dubboErrorFromReason()', () => {
  it('accepts DubboError as unknown', () => {
    const error: unknown = new DubboError(
      'Not permitted',
      Code.PermissionDenied
    )
    const got = dubboErrorFromReason(error)
    expect(got as unknown).toBe(error)
    expect(got.code).toBe(Code.PermissionDenied)
    expect(got.rawMessage).toBe('Not permitted')
  })
  it('accepts any Error', () => {
    const error: unknown = new Error('Not permitted')
    const got = dubboErrorFromReason(error)
    expect(got as unknown).not.toBe(error)
    expect(got.code).toBe(Code.Unknown)
    expect(got.rawMessage).toBe('Not permitted')
  })
  it('accepts string value', () => {
    const error: unknown = 'Not permitted'
    const got = dubboErrorFromReason(error)
    expect(got.code).toBe(Code.Unknown)
    expect(got.rawMessage).toBe('Not permitted')
  })
})

describe('assertDubboError() example', () => {
  /**
   * Asserts that the given reason is a DubboError.
   * If the reason is not a DubboError, or does not
   * have the wanted Code, rethrow it.
   */
  function assertDubboError(
    reason: unknown,
    ...codes: Code[]
  ): asserts reason is DubboError {
    if (reason instanceof DubboError) {
      if (codes.length === 0) {
        return
      }
      if (codes.includes(reason.code)) {
        return
      }
    }
    // reason is not a DubboError, or does
    // not have the wanted Code - rethrow it.
    throw reason
  }
  it('asserts DubboError', () => {
    const err: unknown = new DubboError('foo')
    assertDubboError(err)
    expect(err.rawMessage).toBe('foo')
  })
  it('asserts DubboError with Code', () => {
    const err: unknown = new DubboError('foo', Code.PermissionDenied)
    assertDubboError(err, Code.PermissionDenied)
    expect(err.code).toBe(Code.PermissionDenied)
    expect(err.rawMessage).toBe('foo')
  })
  it('rethrows non-DubboErrors', () => {
    expect(() => assertDubboError(true)).toThrow(true)
  })
  it('rethrows DubboError with unwanted Code', () => {
    const err: unknown = new DubboError('foo', Code.PermissionDenied)
    expect(() => assertDubboError(err, Code.InvalidArgument)).toThrow(err)
  })
})

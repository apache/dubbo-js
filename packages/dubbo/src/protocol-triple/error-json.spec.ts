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

import { DubboError } from '../dubbo-error.js'
import { Code } from '../code.js'
import { Message, proto3, protoBase64, ScalarType } from '@bufbuild/protobuf'
import { errorFromJson, errorToJson } from './error-json.js'

describe('errorToJson()', () => {
  it('serializes code and message', () => {
    const json = errorToJson(
      new DubboError('Not permitted', Code.PermissionDenied),
      undefined
    )
    expect(json.status as unknown).toBe(Code.PermissionDenied)
    expect(json.message as unknown).toBe('Not permitted')
  })
  it('does not serialize empty message', () => {
    const json = errorToJson(
      new DubboError('', Code.PermissionDenied),
      undefined
    )
    expect(json.status as unknown).toBe(Code.PermissionDenied)
    expect(json.message as unknown).toBeUndefined()
  })
  it('serializes details', () => {
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
    const err = new DubboError('Not permitted', Code.PermissionDenied)
    err.details.push(
      new ErrorDetail({ reason: 'soirée 🎉', domain: 'example.com' })
    )
    const got = errorToJson(err, undefined)
    const want = {
      status: Code.PermissionDenied,
      message: 'Not permitted',
      details: [
        {
          type: ErrorDetail.typeName,
          value: protoBase64.enc(
            new ErrorDetail({
              reason: 'soirée 🎉',
              domain: 'example.com'
            }).toBinary()
          ),
          debug: {
            reason: 'soirée 🎉',
            domain: 'example.com'
          }
        }
      ]
    }
    expect(got).toEqual(want)
  })
})

describe('errorFromJson()', () => {
  it('parses code and message', () => {
    const error = errorFromJson(
      {
        status: Code.PermissionDenied,
        message: 'Not permitted'
      },
      undefined,
      new DubboError('foo', Code.ResourceExhausted)
    )
    expect(error.code).toBe(Code.PermissionDenied)
    expect(error.rawMessage).toBe('Not permitted')
    expect(error.details.length).toBe(0)
  })
  it('does not require message', () => {
    const error = errorFromJson(
      {
        status: Code.PermissionDenied
      },
      undefined,
      new DubboError('foo', Code.ResourceExhausted)
    )
    expect(error.message).toBe('[permission_denied]')
    expect(error.rawMessage).toBe('')
  })
  it('with invalid code throws fallback', () => {
    expect(() =>
      errorFromJson(
        {
          status: -1,
          message: 'Not permitted'
        },
        undefined,
        new DubboError('foo', Code.ResourceExhausted)
      )
    ).toThrowError('[resource_exhausted] foo')
  })
  it('with invalid code throws fallback with metadata', () => {
    try {
      errorFromJson(
        {
          code: 'wrong code',
          message: 'Not permitted'
        },
        new Headers({ foo: 'bar' }),
        new DubboError('foo', Code.ResourceExhausted)
      )
      fail('expected error')
    } catch (e) {
      expect(e).toBeInstanceOf(DubboError)
      expect(DubboError.from(e).message).toBe('[resource_exhausted] foo')
      expect(DubboError.from(e).metadata.get('foo')).toBe('bar')
    }
  })
  it('with code Ok throws fallback', () => {
    expect(() =>
      errorFromJson(
        {
          code: 'ok',
          message: 'Not permitted'
        },
        undefined,
        new DubboError('foo', Code.ResourceExhausted)
      )
    ).toThrowError('[resource_exhausted] foo')
  })
  it('with missing code throws fallback', () => {
    expect(() =>
      errorFromJson(
        {
          message: 'Not permitted'
        },
        undefined,
        new DubboError('foo', Code.ResourceExhausted)
      )
    ).toThrowError('[resource_exhausted] foo')
  })
  describe('with details', () => {
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
    const json = {
      status: Code.PermissionDenied,
      message: 'Not permitted',
      details: [
        {
          type: ErrorDetail.typeName,
          value: protoBase64.enc(
            new ErrorDetail({
              reason: 'soirée 🎉',
              domain: 'example.com'
            }).toBinary()
          )
        }
      ]
    }
    it('adds to raw detail', () => {
      const error = errorFromJson(
        json,
        undefined,
        new DubboError('foo', Code.ResourceExhausted)
      )
      expect(error.details.length).toBe(1)
    })
    it('works with findDetails()', () => {
      const error = errorFromJson(
        json,
        undefined,
        new DubboError('foo', Code.ResourceExhausted)
      )
      const details = error.findDetails(ErrorDetail)
      expect(details.length).toBe(1)
      expect(details[0]?.reason).toBe('soirée 🎉')
      expect(details[0]?.domain).toBe('example.com')
    })
  })
})

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

import { StringValue } from '@bufbuild/protobuf'
import type { Serialization } from './serialization.js'
import {
  createBinarySerialization,
  createJsonSerialization,
  getJsonOptions,
  limitSerialization
} from './serialization.js'
import { DubboError } from '../dubbo-error.js'

describe('createBinarySerialization()', function () {
  const goldenMessage = new StringValue({ value: 'abc' })
  const goldenBytes = new StringValue({ value: 'abc' }).toBinary()
  const ser = createBinarySerialization(StringValue, undefined)

  it('should serialize', function () {
    const bytes = ser.serialize(goldenMessage)
    expect(bytes).toEqual(goldenBytes)
  })

  it('should parse', function () {
    const message = ser.parse(goldenBytes)
    expect(goldenMessage.equals(message)).toBeTrue()
  })

  describe('parsing invalid data', function () {
    it('should raise connect error', function () {
      try {
        ser.parse(new Uint8Array([0xde]))
        fail('expected error')
      } catch (e) {
        expect(e).toBeInstanceOf(DubboError)
        const c = DubboError.from(e)
        expect(c.message).toBe('[invalid_argument] parse binary: premature EOF')
      }
    })
  })

  describe('serializing invalid data', function () {
    it('should raise connect error', function () {
      const f = goldenMessage.clone()
      f.toBinary = () => {
        throw 'x'
      }
      try {
        ser.serialize(f)
        fail('expected error')
      } catch (e) {
        expect(e).toBeInstanceOf(DubboError)
        const c = DubboError.from(e)
        expect(c.message).toBe('[internal] serialize binary: x')
      }
    })
  })
})

describe('createJsonSerialization()', function () {
  const goldenMessage = new StringValue({ value: 'abc' })
  const goldenBytes = new TextEncoder().encode(`"abc"`)
  const ser = createJsonSerialization(StringValue, undefined)

  it('should serialize', function () {
    const bytes = ser.serialize(goldenMessage)
    expect(bytes).toEqual(goldenBytes)
  })

  it('should parse', function () {
    const message = ser.parse(goldenBytes)
    expect(goldenMessage.equals(message)).toBeTrue()
  })

  describe('parsing invalid data', function () {
    it('should raise connect error', function () {
      try {
        ser.parse(new Uint8Array([0xde]))
        fail('expected error')
      } catch (e) {
        expect(e).toBeInstanceOf(DubboError)
        const c = DubboError.from(e)
        expect(c.message).toMatch(
          /^\[invalid_argument] cannot decode google.protobuf.StringValue from JSON: Unexpected token/
        )
      }
    })
  })

  describe('serializing invalid data', function () {
    it('should raise connect error', function () {
      const f = goldenMessage.clone()
      f.toJsonString = () => {
        throw 'x'
      }
      try {
        ser.serialize(f)
        fail('expected error')
      } catch (e) {
        expect(e).toBeInstanceOf(DubboError)
        const c = DubboError.from(e)
        expect(c.message).toBe('[internal] x')
      }
    })
  })
})

describe('limitSerialization()', function () {
  const ser: Serialization<string> = {
    serialize(data: string): Uint8Array {
      return new TextEncoder().encode(data)
    },
    parse(data: Uint8Array): string {
      return new TextDecoder().decode(data)
    }
  }
  it('limits serialize', function () {
    const limitedSer = limitSerialization(ser, {
      readMaxBytes: 0xffffffff,
      writeMaxBytes: 3
    })
    expect(() => limitedSer.serialize('abcdef')).toThrowError(
      DubboError,
      '[resource_exhausted] message size 6 is larger than configured writeMaxBytes 3'
    )
    expect(() =>
      limitedSer.parse(new TextEncoder().encode('abcdef'))
    ).not.toThrowError()
  })
  it('limits parse', function () {
    const limitedSer = limitSerialization(ser, {
      readMaxBytes: 3,
      writeMaxBytes: 0xffffffff
    })
    expect(() => limitedSer.serialize('abcdef')).not.toThrowError()
    expect(() =>
      limitedSer.parse(new TextEncoder().encode('abcdef'))
    ).toThrowError(
      DubboError,
      '[resource_exhausted] message size 6 is larger than configured readMaxBytes 3'
    )
  })
})

describe('getJsonOptions()', function () {
  it('sets ignoreUnknownFields to true if not already set on options object', function () {
    const opts = getJsonOptions({ emitDefaultValues: true })
    expect(opts.ignoreUnknownFields).toBeTrue()
  })
  it('sets ignoreUnknownFields to true if undefined is passed', function () {
    const opts = getJsonOptions(undefined)
    expect(opts.ignoreUnknownFields).toBeTrue()
  })
  it("doesn't change ignoreUnknownFields if already set", function () {
    const opts = getJsonOptions({ ignoreUnknownFields: false })
    expect(opts.ignoreUnknownFields).toBeFalse()
  })
})

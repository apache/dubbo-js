/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import ByteBuffer from '../byte-buffer'

describe('byte buffer test suite', () => {
  it('test init buffer', () => {
    {
      // test init buffer with no argument
      const buffer = new ByteBuffer()
      expect(buffer.getWriteIndex()).toEqual(0)
      expect(buffer.getReadIndex()).toEqual(0)
      expect(buffer.getLength()).toEqual(0)
      expect(buffer.getCapacity()).toEqual(1024)
    }

    {
      // test init buffer with buffer
      const buffer = new ByteBuffer({ buffer: Buffer.from('abc') })
      expect(buffer.getWriteIndex()).toEqual(2)
      expect(buffer.getReadIndex()).toEqual(0)
      expect(buffer.getLength()).toEqual(3)
      expect(buffer.getCapacity()).toEqual(1024)
    }
  })

  it('test write some thing..', () => {
    const buf = new ByteBuffer()
      .writeByte(10)
      .writeShort(0xdada)
      .writeInt(0x01010101)
      .buffer()
    expect(buf.length).toEqual(7)
  })

  it('test write custom offset', () => {
    const buf = new ByteBuffer()
      .writeBytes(Buffer.from('123'))
      .writeByte(10, { index: 10 })
      .writeByte(9, { index: 8 })
      .resetWriteIndex(11)
      .writeString('abc')
      .writeBytes(Buffer.alloc(5).fill(1), { index: 0 })
      .buffer()
    expect(buf.length).toEqual(19)
    expect(buf.subarray(11, 14).toString()).toEqual('abc')
    expect(buf[8]).toEqual(9)
  })

  it('test custom default alloc size', () => {
    const buf = new ByteBuffer({ defaultAllocSize: 5 })

    expect((buf as any).capacity).toEqual(5)
    buf.writeString(`abcdefg`)
    // expand default alloc size
    expect((buf as any).capacity).toEqual(10)
    buf.writeString(`hijklmnoprst`)
    // expand Offset - this.capacity
    expect((buf as any).capacity).toEqual(19)
  })

  it('test read some thing', () => {
    const buffer = new ByteBuffer()
      .writeByte(1)
      .writeShort(21)
      .writeInt(0x01010101)
      .writeBytes(Buffer.from('hello'))
      .writeString('world')
      .buffer()

    const reader = new ByteBuffer({ buffer }).resetReadIndex()
    expect(reader.readByte()).toEqual(1)
    expect(reader.readShort({ unsigned: true })).toEqual(21)
    expect(reader.readInt({ unsigned: false })).toEqual(0x01010101)
    expect(reader.readBytes({ len: 4 }).toString()).toEqual('hell')
    expect(reader.readString()).toEqual('oworld')
  })

  it('test slice and splice', () => {
    {
      // test slice
      const buff = new ByteBuffer({ buffer: Buffer.alloc(10) })
      buff.resetWriteIndex()
      buff.writeInt(0x01020304)
      const sub = buff.slice(2, 4)
      expect(sub[0]).toEqual(0x03)
      expect(sub[1]).toEqual(0x04)
    }

    {
      // test splice
      const buff = new ByteBuffer({ buffer: Buffer.alloc(10) })
      buff.resetWriteIndex(0)
      buff.writeInt(0x01020304)
      buff.writeInt(0x05060708)
      buff.writeShort(0x090a)

      // slice from start
      const sub = buff.splice(0, 2)
      expect(sub[0]).toEqual(0x01)
      expect(sub[1]).toEqual(0x02)
      expect(buff.getLength()).toEqual(8)
      expect(buff.getWriteIndex()).toEqual(8)

      // slice from middle

      const sub1 = buff.splice(1, 3)
      expect(buff.buffer()[0]).toEqual(0x03)
      expect(sub1.length).toEqual(2)
      expect(sub1[0]).toEqual(0x04)
      expect(sub1[1]).toEqual(0x05)

      expect(buff.getWriteIndex()).toEqual(6)
      expect(buff.getLength()).toEqual(6)
    }
  })
})

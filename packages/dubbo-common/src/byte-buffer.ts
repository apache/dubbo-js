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

import { Buffer } from 'node:buffer'

export interface ByteBufferProp {
  buffer?: Buffer
  defaultAllocSize?: number
}

export interface ReadWriteProp {
  /**
   * set read or write index
   */
  index?: number

  /**
   * set read or write unsigned int
   */
  unsigned?: boolean

  /**
   * set read or write endian
   */
  endian?: 'LE' | 'BE'

  /**
   * specify read bytes length
   */
  len?: number
}

const DEFAULT_ALLOC_SIZE = 1024

/**
 * BufferBuffer is a buffer wrapper class
 * which can be used to read and write data to buffer.
 */
export default class ByteBuffer {
  private buff: Buffer

  private writeIndex: number
  private readIndex: number

  private length: number
  private capacity: number

  private readonly defaultAllocSize: number

  /**
   * constructor
   *
   * @param prop
   */
  constructor(prop?: ByteBufferProp) {
    prop ||= {}

    this.defaultAllocSize = prop.defaultAllocSize || DEFAULT_ALLOC_SIZE

    if (prop.buffer) {
      this.buff = prop.buffer

      this.readIndex = 0
      this.writeIndex = this.buff.length - 1
      this.length = this.buff.length
      this.capacity = Math.max(this.buff.length, this.defaultAllocSize)
    } else {
      this.buff = Buffer.alloc(this.defaultAllocSize)

      this.writeIndex = 0
      this.readIndex = 0
      this.length = 0
      this.capacity = this.defaultAllocSize
    }
  }

  /**
   * add one byte to buffer
   * @param val
   * @param prop
   * @returns
   */
  writeByte(val: number, prop?: ReadWriteProp) {
    const opt = this.defaultReadWriteProp('write', prop)
    const next = opt.index + 1
    this.checkCapacity(next)

    this.buff.writeUInt8(val, opt.index)

    this.writeIndex = next
    if (next > this.length) {
      this.length = next
    }

    return this
  }

  /**
   * read one byte from buffer
   * @param prop offset
   */
  readByte(prop?: ReadWriteProp) {
    const opt = this.defaultReadWriteProp('read', prop)
    const val = this.buff.readUInt8(opt.index)

    this.readIndex = opt.index + 1

    return val
  }

  /**
   * add two bytes to buffer
   * @param val number
   * @param prop offset
   * @returns
   */
  writeShort(val: number, prop?: ReadWriteProp) {
    const opt = this.defaultReadWriteProp('write', prop)
    const next = opt.index + 2
    this.checkCapacity(next)

    if (opt.endian === 'BE') {
      opt.unsigned
        ? this.buff.writeInt16BE(val, opt.index)
        : this.buff.writeUInt16BE(val, opt.index)
    } else {
      opt.unsigned
        ? this.buff.writeInt16LE(val, opt.index)
        : this.buff.writeUint16LE(val, opt.index)
    }

    this.writeIndex = next
    if (next > this.length) {
      this.length = next
    }

    return this
  }

  /**
   * read two byte and convert to unsigned short
   * @param prop offset
   * @returns
   */
  readShort(prop?: ReadWriteProp) {
    const opt = this.defaultReadWriteProp('read', prop)

    let val
    if (opt.endian === 'BE') {
      val = opt.unsigned
        ? this.buff.readUInt16BE(opt.index)
        : this.buff.readInt16BE(opt.index)
    } else {
      val = opt.unsigned
        ? this.buff.readUint16LE(opt.index)
        : this.buff.readInt16LE(opt.index)
    }

    this.readIndex += 2

    return val
  }

  /**
   * add four bytes to buffer
   * @param val number
   * @param prop
   * @returns
   */
  writeInt(val: number, prop?: ReadWriteProp) {
    const opt = this.defaultReadWriteProp('write', prop)
    const next = opt.index + 4
    this.checkCapacity(next)

    if (opt.endian === 'BE') {
      opt.unsigned
        ? this.buff.writeUInt32BE(val, opt.index)
        : this.buff.writeInt32BE(val, opt.index)
    } else {
      opt.unsigned
        ? this.buff.writeUInt32LE(val, opt.index)
        : this.buff.writeInt32LE(val, opt.index)
    }

    this.writeIndex = next
    if (next > this.length) {
      this.length = next
    }

    return this
  }

  /**
   * read four bytes and convert to unsigned int
   * @returns
   */
  readInt(prop?: ReadWriteProp) {
    const opt = this.defaultReadWriteProp('read', prop)

    let val

    if (opt.endian === 'BE') {
      val = opt.unsigned
        ? this.buff.readUInt32BE(opt.index)
        : this.buff.readInt32BE(opt.index)
    } else {
      val = opt.unsigned
        ? this.buff.readUInt32LE(opt.index)
        : this.buff.readInt32LE(opt.index)
    }

    this.readIndex += 4

    return val
  }

  /**
   * add bytes to buffer
   * @param val
   * @param prop
   * @returns
   */
  writeBytes(val: Buffer, prop?: ReadWriteProp) {
    const opt = this.defaultReadWriteProp('write', prop)
    const next = opt.index + val.length

    this.checkCapacity(next)
    val.copy(this.buff, opt.index, 0)

    this.writeIndex = next
    if (next > this.length) {
      this.length = next
    }

    return this
  }

  /**
   * read bytes from buffer
   *
   * @returns
   */
  readBytes(prop?: ReadWriteProp) {
    const opt = this.defaultReadWriteProp('read', prop)
    const end = Math.min(opt.index + opt.len, this.buff.length)
    const val = this.buff.subarray(opt.index, end)

    this.readIndex = end

    return val
  }

  /**
   * add string to buffer
   * @param val
   * @param prop
   * @returns
   */
  writeString(val: string, prop?: ReadWriteProp) {
    const buf = Buffer.from(val)
    return this.writeBytes(buf, prop)
  }

  /**
   * read string from buffer
   * @returns
   */
  readString(prop?: ReadWriteProp) {
    const opt = this.defaultReadWriteProp('read', prop)
    const val = this.readBytes(opt)
    return val.toString()
  }

  /**
   * get val index
   *
   * @param val
   */
  indexOf(val: number | string | Uint8Array) {
    return this.buff.indexOf(val)
  }

  includes(val: number | string | Buffer) {
    return this.buff.includes(val)
  }

  /**
   * slice buffer
   * @param start
   * @param end
   */
  slice(start: number, end?: number) {
    return this.buff.subarray(start, end)
  }

  /**
   * splice buffer
   * @param start
   * @param end
   * @returns
   */
  splice(start: number, end?: number) {
    end ||= this.length
    if (end > this.capacity) {
      end = this.capacity
    }

    const val = this.buff.subarray(start, end)
    this.buff = Buffer.concat([
      this.buff.subarray(0, start),
      this.buff.subarray(end, this.capacity)
    ])

    this.length -= end - start

    if (this.writeIndex > end) {
      this.writeIndex -= end - start
    }

    if (this.readIndex > end) {
      this.readIndex -= end - start
    }

    return val
  }

  /**
   * get buffer
   *
   * @returns buffer
   */
  buffer() {
    return this.buff.subarray(0, this.length)
  }

  /**
   * get read index
   * @returns read index
   */
  getReadIndex() {
    return this.readIndex
  }

  /**
   * get read index
   * @param index
   * @returns
   */
  resetReadIndex(index?: number) {
    index ||= 0
    this.readIndex = index

    return this
  }

  /**
   * get write index
   * @returns write index
   */
  getWriteIndex() {
    return this.writeIndex
  }

  /**
   * reset write index
   * @param index
   * @returns
   */
  resetWriteIndex(index?: number) {
    index ||= 0
    this.writeIndex = index

    return this
  }

  /**
   * current buffer write length
   * @returns length
   */
  getLength() {
    return this.length
  }

  /**
   * buffer capacity
   *
   * @returns total buffer length
   */
  getCapacity() {
    return this.capacity
  }

  /**
   * set default read write prop
   *
   * @param prop
   * @returns
   */
  private defaultReadWriteProp(
    type: string,
    prop?: ReadWriteProp
  ): Required<ReadWriteProp> {
    prop || (prop = {})
    prop.index ||= type === 'write' ? this.writeIndex : this.readIndex
    prop.endian ||= 'BE'
    prop.unsigned ||= false
    prop.len ||= this.length

    return prop as Required<ReadWriteProp>
  }

  /**
   * check capacity and auto expand capacity
   *
   * @param nextWriteIndex
   * @returns
   */
  private checkCapacity(nextWriteIndex: number) {
    if (nextWriteIndex < this.capacity) {
      return
    }

    // expand capacity
    this.capacity += Math.max(
      nextWriteIndex - this.capacity,
      this.defaultAllocSize
    )

    // copy
    const buff = Buffer.alloc(this.capacity)
    this.buff.copy(buff, 0, 0, this.writeIndex)
    this.buff = buff
  }
}

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
}

const DEFAULT_ALLOC_SIZE = 1024

/**
 * BufferBuffer is a buffer wrapper class
 * which can be used to read and write data to buffer.
 */
export default class ByteBuffer {
  private readonly defaultAllocSize: number

  private buff: Buffer
  private cursor: number
  private length: number
  private capacity: number

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

      this.cursor = this.buff.length - 1
      this.length = this.buff.length
      this.capacity = Math.max(this.buff.length, this.defaultAllocSize)
    } else {
      this.buff = Buffer.alloc(this.defaultAllocSize)

      this.cursor = 0
      this.length = 0
      this.capacity = this.defaultAllocSize
    }
  }

  /**
   * reset cursor position
   * @param idx
   * @returns
   */
  resetCursor(idx: number = 0) {
    this.cursor = idx || 0
    return this
  }

  getCursor() {
    return this.cursor
  }

  /**
   * add one byte to buffer
   * @param val
   * @param prop
   * @returns
   */
  writeByte(val: number, prop?: ReadWriteProp) {
    const opt = this.defaultReadWriteProp(prop)
    this.cursor = opt.index
    const next = this.cursor + 1
    this.checkCapacity(next)

    opt.unsigned
      ? this.buff.writeUInt8(val, this.cursor)
      : this.buff.writeInt8(val, this.cursor)

    this.cursor = next
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
    const opt = this.defaultReadWriteProp(prop)
    this.cursor = opt.index
    const val = this.buff.readUInt8(this.cursor)
    this.cursor++
    return val
  }

  /**
   * add two bytes to buffer
   * @param val number
   * @param prop offset
   * @returns
   */
  writeShort(val: number, prop?: ReadWriteProp) {
    const opt = this.defaultReadWriteProp(prop)
    this.cursor = opt.index
    const next = this.cursor + 2
    this.checkCapacity(next)

    if (opt.endian === 'BE') {
      opt.unsigned
        ? this.buff.writeInt16BE(val, this.cursor)
        : this.buff.writeUInt16BE(val, this.cursor)
    } else {
      opt.unsigned
        ? this.buff.writeInt16LE(val, this.cursor)
        : this.buff.writeUint16LE(val, this.cursor)
    }

    this.cursor = next
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
    const opt = this.defaultReadWriteProp(prop)
    this.cursor = prop.index

    let val: number
    if (opt.endian === 'BE') {
      val = opt.unsigned
        ? this.buff.readUInt16BE(this.cursor)
        : this.buff.readInt16BE(this.cursor)
    } else {
      val = opt.unsigned
        ? this.buff.readUint16LE(this.cursor)
        : this.buff.readInt16LE(this.cursor)
    }

    this.cursor += 2
    return val
  }

  /**
   * add four bytes to buffer
   * @param val number
   * @param prop
   * @returns
   */
  writeInt(val: number, prop?: ReadWriteProp) {
    const opt = this.defaultReadWriteProp(prop)
    this.cursor = opt.index
    const next = this.cursor + 4
    this.checkCapacity(next)

    if (opt.endian === 'BE') {
      opt.unsigned
        ? this.buff.writeUInt32BE(val, this.cursor)
        : this.buff.writeInt32BE(val, this.cursor)
    } else {
      opt.unsigned
        ? this.buff.writeUInt32LE(val, this.cursor)
        : this.buff.writeInt32LE(val, this.cursor)
    }

    this.cursor = next
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
    const opt = this.defaultReadWriteProp(prop)
    this.cursor = opt.index

    let val: number
    if (opt.endian === 'BE') {
      val = opt.unsigned
        ? this.buff.readUInt32BE(opt.index)
        : this.buff.readInt32BE(opt.index)
    } else {
      val = opt.unsigned
        ? this.buff.readUInt32LE(opt.index)
        : this.buff.readInt32LE(opt.index)
    }

    this.cursor += 4
    return val
  }

  /**
   * write 8 bytes
   * @param num
   * @param prop
   * @returns
   */
  writeLong(num: number, prop?: ReadWriteProp) {
    const opt = this.defaultReadWriteProp(prop)
    this.cursor = opt.index
    const next = this.cursor + 8

    this.checkCapacity(next)

    if (opt.endian === 'BE') {
      opt.unsigned
        ? this.buff.writeBigUInt64BE(BigInt(num), this.cursor)
        : this.buff.writeBigInt64BE(BigInt(num), this.cursor)
    } else {
      opt.unsigned
        ? this.buff.writeBigUInt64LE(BigInt(num), this.cursor)
        : this.buff.writeBigInt64LE(BigInt(num), this.cursor)
    }

    this.cursor = next
    if (next > this.length) {
      this.length = next
    }

    return this
  }

  readLong(prop?: ReadWriteProp) {
    const opt = this.defaultReadWriteProp(prop)
    this.cursor = opt.index

    let val: bigint

    if (opt.endian === 'BE') {
      val = opt.unsigned
        ? this.buff.readBigUInt64BE(this.cursor)
        : this.buff.readBigInt64BE(this.cursor)
    } else {
      val = opt.unsigned
        ? this.buff.readBigUInt64LE(this.cursor)
        : this.buff.readBigUInt64LE(this.cursor)
    }

    this.cursor += 8
    return val
  }

  /**
   * add bytes to buffer
   * @param val
   * @param prop
   * @returns
   */
  writeBytes(val: Buffer, prop?: ReadWriteProp) {
    const opt = this.defaultReadWriteProp(prop)
    this.cursor = opt.index
    const next = this.cursor + val.length

    this.checkCapacity(next)
    val.copy(this.buff, this.cursor, 0, val.length)

    this.cursor = next
    if (next > this.length) {
      this.length = next
    }

    return this
  }

  concat(val: Buffer) {
    this.cursor = this.length === 0 ? 0 : this.length - 1
    const next = this.cursor + val.length

    this.checkCapacity(next)
    val.copy(this.buff, this.cursor, 0)

    this.cursor = next
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
  readBytes(prop: { index?: number; size?: number } = {}) {
    prop.index ||= this.cursor
    prop.size ||= this.buff.length

    if (typeof prop.index === 'undefined') {
      prop.index = this.cursor
    }

    const end = Math.min(this.cursor + prop.size, this.buff.length)
    const val = this.buff.subarray(prop.index, end)

    this.cursor = end
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
  readString(prop: { index?: number; size?: number } = {}) {
    const val = this.readBytes(prop)
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

  /**
   * return true if include val
   * @param val
   * @returns
   */
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
    if (!end && end > this.length) {
      end = this.length
    }

    const val = this.buff.subarray(start, end)
    this.buff = Buffer.concat([
      this.buff.subarray(0, start),
      this.buff.subarray(end, this.capacity)
    ])

    this.length -= end - start
    this.capacity -= end - start
    if (this.cursor >= end) {
      this.cursor -= end - start
    } else if (this.cursor > start) {
      this.cursor = start
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
  private defaultReadWriteProp(prop?: ReadWriteProp): Required<ReadWriteProp> {
    prop || (prop = {})
    prop.endian ||= 'BE'
    prop.unsigned ||= false
    if (typeof prop.index === 'undefined') {
      prop.index = this.cursor
    }
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
    this.buff.copy(buff, 0, 0, this.cursor)
    this.buff = buff
  }
}

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
  private offset: number
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

      this.offset = this.buff.length - 1
      this.length = this.buff.length
      this.capacity = Math.max(this.buff.length, this.defaultAllocSize)
    } else {
      this.buff = Buffer.alloc(this.defaultAllocSize)

      this.offset = 0
      this.length = 0
      this.capacity = this.defaultAllocSize
    }
  }

  /**
   * static method to create a ByteBuffer instance
   * @param prop byte buffer prop
   * @returns
   */
  static from(prop?: ByteBufferProp) {
    return new ByteBuffer(prop)
  }

  /**
   * set offset is 0
   */
  resetOffset() {
    this.offset = 0
    return this
  }

  /**
   * reset cursor position
   * @param idx
   * @returns
   */
  setOffset(idx: number) {
    if (idx < 0) {
      throw new Error('offset must be greater than 0')
    }

    this.offset = idx || 0
    return this
  }

  /**
   * get current offset
   * @returns current offset
   */
  getOffset() {
    return this.offset
  }

  /**
   * skip offset
   * @param len skip length
   * @returns
   */
  skip(len: number) {
    this.offset += len
    this.checkCapacity(this.offset)
    return this
  }

  /**
   * add one byte to buffer
   * @param val
   * @param prop
   * @returns
   */
  writeByte(val: number, prop?: ReadWriteProp) {
    const opt = this.defaultReadWriteProp(prop)
    this.offset = opt.index
    const next = this.offset + 1
    this.checkCapacity(next)

    opt.unsigned
      ? this.buff.writeUInt8(val, this.offset)
      : this.buff.writeInt8(val, this.offset)

    this.offset = next
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
    this.offset = opt.index
    const val = this.buff.readUInt8(this.offset)
    this.offset++
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
    this.offset = opt.index
    const next = this.offset + 2
    this.checkCapacity(next)

    if (opt.endian === 'BE') {
      opt.unsigned
        ? this.buff.writeInt16BE(val, this.offset)
        : this.buff.writeUInt16BE(val, this.offset)
    } else {
      opt.unsigned
        ? this.buff.writeInt16LE(val, this.offset)
        : this.buff.writeUint16LE(val, this.offset)
    }

    this.offset = next
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
    this.offset = prop.index

    let val: number
    if (opt.endian === 'BE') {
      val = opt.unsigned
        ? this.buff.readUInt16BE(this.offset)
        : this.buff.readInt16BE(this.offset)
    } else {
      val = opt.unsigned
        ? this.buff.readUint16LE(this.offset)
        : this.buff.readInt16LE(this.offset)
    }

    this.offset += 2
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
    this.offset = opt.index
    const next = this.offset + 4
    this.checkCapacity(next)

    if (opt.endian === 'BE') {
      opt.unsigned
        ? this.buff.writeUInt32BE(val, this.offset)
        : this.buff.writeInt32BE(val, this.offset)
    } else {
      opt.unsigned
        ? this.buff.writeUInt32LE(val, this.offset)
        : this.buff.writeInt32LE(val, this.offset)
    }

    this.offset = next
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
    this.offset = opt.index

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

    this.offset += 4
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
    this.offset = opt.index
    const next = this.offset + 8

    this.checkCapacity(next)

    if (opt.endian === 'BE') {
      opt.unsigned
        ? this.buff.writeBigUInt64BE(BigInt(num), this.offset)
        : this.buff.writeBigInt64BE(BigInt(num), this.offset)
    } else {
      opt.unsigned
        ? this.buff.writeBigUInt64LE(BigInt(num), this.offset)
        : this.buff.writeBigInt64LE(BigInt(num), this.offset)
    }

    this.offset = next
    if (next > this.length) {
      this.length = next
    }

    return this
  }

  readLong(prop?: ReadWriteProp) {
    const opt = this.defaultReadWriteProp(prop)
    this.offset = opt.index

    let val: bigint

    if (opt.endian === 'BE') {
      val = opt.unsigned
        ? this.buff.readBigUInt64BE(this.offset)
        : this.buff.readBigInt64BE(this.offset)
    } else {
      val = opt.unsigned
        ? this.buff.readBigUInt64LE(this.offset)
        : this.buff.readBigUInt64LE(this.offset)
    }

    this.offset += 8
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
    this.offset = opt.index
    const next = this.offset + val.length

    this.checkCapacity(next)
    val.copy(this.buff, this.offset, 0, val.length)

    this.offset = next
    if (next > this.length) {
      this.length = next
    }

    return this
  }

  concat(val: Buffer) {
    this.offset = this.length === 0 ? 0 : this.length - 1
    const next = this.offset + val.length

    this.checkCapacity(next)
    val.copy(this.buff, this.offset, 0)

    this.offset = next
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
    prop.index ||= this.offset
    prop.size ||= this.buff.length

    if (typeof prop.index === 'undefined') {
      prop.index = this.offset
    }

    const end = Math.min(this.offset + prop.size, this.buff.length)
    const val = this.buff.subarray(prop.index, end)

    this.offset = end
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
    if (this.offset >= end) {
      this.offset -= end - start
    } else if (this.offset > start) {
      this.offset = start
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
      prop.index = this.offset
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
    this.buff.copy(buff, 0, 0, this.offset)
    this.buff = buff
  }
}

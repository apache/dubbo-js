import {binaryNum, convertBinaryNum} from '../binary';

describe('binary test suite', () => {
  it('test binaryNum', () => {
    expect(binaryNum(1025, 4)).toEqual(new Buffer([0x00, 0x00, 0x04, 0x01]));
    expect(binaryNum(201212, 4)).toEqual(new Buffer([0x00, 0x03, 0x11, 0xfc]));
  });

  it('test convert number', () => {
    expect(convertBinaryNum(new Buffer([0x00, 0x00, 0x04, 0x01]), 4)).toEqual(
      1025,
    );
    expect(convertBinaryNum(new Buffer([0x00, 0x03, 0x11, 0xfc]), 4)).toEqual(
      201212,
    );
  });

  it('test binary uuid', () => {
    const seed = 13234234234234234234;
    const buffer = binaryNum(seed, 8);
    const num = convertBinaryNum(buffer, 8);
    expect(seed).toEqual(num);
  });
});

import {Buffer} from 'buffer';
import DecodeBuffer from '../decode-buffer';
import {decode} from '../decode';

it('test receive right data', () => {
  const buffer = Buffer.from([
    0xda,
    0xbb,
    0x02,
    0x14,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x02,
    0x00,
    0x00,
    0x00,
    0x06,
    0x91,
    0x04,
    0x70,
    0x61,
    0x6e,
    0x67,
  ]);
  const dBuff = DecodeBuffer.from(1).subscribe(data => {
    const {requestId, res, err} = decode(data);
    expect(requestId).toEqual(2);
    expect(res).toEqual('pang');
    expect(err).toEqual(null);
  });
  dBuff.receive(buffer);
});

it('test receive wrong data', () => {
  const buffer = Buffer.from([
    0x00,
    0x32,
    0xe2,
    0xda,
    0xbb,
    0x02,
    0x14,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x02,
    0x00,
    0x00,
    0x00,
    0x06,
    0x91,
    0x04,
    0x70,
    0x61,
    0x6e,
    0x67,
  ]);
  const dBuff = DecodeBuffer.from(1).subscribe(data => {
    const {requestId, res, err} = decode(data);
    expect(requestId).toEqual(2);
    expect(res).toEqual('pang');
    expect(err).toEqual(null);
  });
  dBuff.receive(buffer);
});

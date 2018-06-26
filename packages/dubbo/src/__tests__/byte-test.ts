import {fromBytes4, fromBytes8, toBytes4, toBytes8} from '../byte';

it('test byte4', () => {
  const MAX = 4294967295; //2 ** 32 - 1
  for (let i = MAX; i > MAX - 100; i--) {
    const byte = toBytes4(i);
    expect(fromBytes4(byte)).toEqual(i);
  }
});

it('test byte8', () => {
  const MAX = Number.MAX_SAFE_INTEGER - 1;
  for (let i = MAX; i > MAX - 100; i--) {
    const byteBuf = toBytes8(i);
    expect(fromBytes8(byteBuf)).toEqual(i);
  }
});

import * as requestId from '../request-id';
import {binaryNum, convertBinaryNum} from '../binary';

it('test generate uuid', () => {
  expect(requestId.uuid()).toEqual(1);
  expect(requestId.uuid()).toEqual(2);
  expect(requestId.uuid()).toEqual(3);
  expect(requestId.uuid()).toEqual(4);
  expect(requestId.uuid()).toEqual(5);
});

it('test binary uuid', () => {
  const seed = 13234234234234234234;
  const buffer = binaryNum(seed, 8);
  const num = convertBinaryNum(buffer, 8);
  expect(seed).toEqual(num);
});

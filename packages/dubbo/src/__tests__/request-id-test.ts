import {id} from '../request-id';

it('test generate uuid', () => {
  expect(id()).toEqual(1);
  expect(id()).toEqual(2);
  expect(id()).toEqual(3);
  expect(id()).toEqual(4);
  expect(id()).toEqual(5);
});

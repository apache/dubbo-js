import {to} from '../to';
import * as fs from 'fs';
import {promisify} from 'util';
import {setTimeout} from 'timers';

it('test resolve', async () => {
  const test = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      resolve('1');
    });
  };

  const {res, err} = await to(test());
  expect(res).toEqual('1');
  expect(err).toEqual(null);
});

it('test reject', async () => {
  const test = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      reject(new Error('I am wrong.'));
    });
  };

  const {res, err} = await to(test());
  expect(res).toEqual(null);
  expect(err.message).toEqual('I am wrong.');
});

it('test setTimeout async', async () => {
  const setTimeoutPromisify = promisify(setTimeout);
  const {res, err} = await to(setTimeoutPromisify(50));
  expect(res).toEqual(null);
  expect(err).toEqual(null);
});

it('test fs.exists async', async () => {
  const existsPromisify = promisify(fs.exists);
  const {res, err} = await to(existsPromisify('./to-test.ts'));
  expect(res).toEqual(false);
  expect(err).toEqual(null);
});

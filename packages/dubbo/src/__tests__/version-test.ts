import {Version} from '../common/util';

it('test getIntVersion', () => {
  const v1 = Version.getIntVersion('2.0.2');
  expect(v1).toEqual(2000200);

  const v2 = Version.getIntVersion('2.0.99');
  expect(v2).toEqual(2009900);
});

it('test getPrefixDigits', () => {
  const v = Version.getPrefixDigits('2.0.22');
  expect(v).toEqual('2');
  const v1 = Version.getPrefixDigits('stable');
  expect(v1).toEqual('');
});

it('test isSupportResponseAttachment', () => {
  const isSupport1 = Version.isSupportResponseAttachment('2.0.3');
  expect(isSupport1).toEqual(true);

  const isSupport2 = Version.isSupportResponseAttachment('2.0.98');
  expect(isSupport2).toEqual(true);

  const isSupport3 = Version.isSupportResponseAttachment('2.0.100');
  expect(isSupport3).toEqual(false);

  const isSupport4 = Version.isSupportResponseAttachment('2.0.1');
  expect(isSupport4).toEqual(false);
});

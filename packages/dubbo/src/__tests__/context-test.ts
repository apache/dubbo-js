import Context from '../context';
import java from 'js-to-java';

describe('context test suite', () => {
  it('test default Value', () => {
    const ctx = Context.create();
    expect(ctx.requestId).toEqual(1);
    expect(ctx.application).toEqual({name: 'dubbo2.js'});
    expect(ctx.isNotScheduled).toEqual(true);
  });

  it('test hessian', () => {
    const ctx = Context.create();
    ctx.methodArgs = [1, 'hello'] as any;
    expect(ctx.isMethodArgsHessianType).toEqual(false);

    ctx.methodArgs = [java.int(1), java.String('hello')] as any;
    expect(ctx.isMethodArgsHessianType).toEqual(true);
  });
});

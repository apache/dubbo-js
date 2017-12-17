async function hello() {
  return {err: null, res: 'hello'};
}

async function world() {
  return {err: null, res: 'world'};
}

async function temp() {
  return {err: new Error('I am error'), res: null};
}

class AsyncWrapper {
  public error: Error;

  private constructor() {
    this.error = null;
  }

  static create() {
    return new AsyncWrapper();
  }

  async go(fn) {
    if (this.error) {
      return null;
    }

    const {err, res} = await fn();

    if (err) {
      this.error = err;
      return null;
    }

    return {err, res};
  }

  get err() {
    return this.error;
  }
}

it('test async', async () => {
  const aw = AsyncWrapper.create();
  const res = await aw.go(hello);
  expect(res).toEqual({err: null, res: 'hello'});

  const res1 = await aw.go(temp);
  expect(res1).toEqual(null);

  const res2 = await aw.go(world);
  expect(res2).toEqual(null);

  if (aw.error) {
    expect(aw.error.message).toEqual('I am error');
  }
});

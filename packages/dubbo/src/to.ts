export function to<T>(promise: Promise<T>): Promise<{err: Error; res: T}> {
  return promise.then((res: T = null) => ({res, err: null})).catch(err => ({
    res: null,
    err,
  }));
}

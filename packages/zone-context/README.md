## zone-context

a nodejs call stack context just like java ThreadLocal.

## Why?

我们在做一些 trace 的时候，需要知道上下文信息，比如一个请求中包含了几次 dubbo 请求的调用，我们需要知道某次 dubbo 的调用在哪个请求的上下文，方便我们的 trace 和排查问题。针对这样的场景我们希望可以做到的隐式的传递参数获取上下文信息

## How?

1.  很早之前 node 有 domain 的 api，
2.  Angular 社区的 zone.js
3.  node 新特性 async_hooks
4.  other...

## getting started ?

```sh
npm install zone-context
```

```
//demo
import zone from 'zone-context';

it('test zone context', () => {
  zone.setRootContext('uuid', 1);
  expect(zone.get('uuid')).toEqual(1);

  (() => {
    //async
    setTimeout(() => {
      expect(zone.get('uuid')).toEqual(1);
    }, 20);

    //async
    process.nextTick(() => {
      expect(zone.get('uuid')).toEqual(1);
    });

    //nested
    new Promise(resolve => {
      new Promise(r => {
        setTimeout(() => {
          expect(zone.get('uuid')).toEqual(1);
          setImmediate(() => {
            expect(zone.get('uuid')).toEqual(1);
            process.nextTick(() => {
              expect(zone.get('uuid')).toEqual(1);
            });
          });
          r();
        }, 20);
      }).then(() => {
        expect(zone.get('uuid')).toEqual(1);
        resolve();
      });
    });
  })();

  expect(zone.get('uuid')).toEqual(1);
});
```

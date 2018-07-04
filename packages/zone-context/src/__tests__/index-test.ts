import zone from '../index';

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

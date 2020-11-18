import DubboServer from './server';

const server = new DubboServer({
  port: 20880,
  registry: 'localhost:2181',
  services: [
    {
      clazz: 'com.alibaba.dubbo.demo.DemoService',
      version: '1.0.0',
      method: {
        sayHello(name: string, rest: boolean) {
          return {name, rest};
        },
        getUserInfo(userInfo: Object) {
          return userInfo;
        },
      },
    },
  ],
});

server.start();

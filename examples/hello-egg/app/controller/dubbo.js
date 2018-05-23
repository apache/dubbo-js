const {Dubbo, java} = require('dubbo2.js');

const dubbo = new Dubbo({
  application: {name: 'dubbo-node-consumer'},
  register: 'localhost:2181',
  dubboVersion: '2.0.0',
  interfaces: ['com.alibaba.dubbo.demo.DemoProvider'],
});

const demoService = dubbo.proxyService({
  dubboInterface: 'com.alibaba.dubbo.demo.DemoProvider',
  version: '1.0.0',
  methods: {
    sayHello(name) {
      return [java.String(name)];
    },

    echo() {},

    test() {},

    getUserInfo() {
      return [
        java.combine('com.alibaba.dubbo.demo.UserRequest', {
          id: 1,
          name: 'nodejs',
          email: 'node@qianmi.com',
        }),
      ];
    },
  },
});

module.exports = demoService;

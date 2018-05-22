const {Dubbo, java} = require('dubbo2.js/es6');

const dubbo = new Dubbo({
  application: {name: 'dubbo-node-consumer'},
  register: 'localhost:2181',
  dubboVersion: '2.0.0',
  interfaces: [
    'com.alibaba.dubbo.demo.DemoProvider',
    'com.alibaba.dubbo.demo.BasicTypeProvider',
    'com.alibaba.dubbo.demo.ErrorProvider',
  ],
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

const basicTypeService = dubbo.proxyService({
  dubboInterface: 'com.alibaba.dubbo.demo.BasicTypeProvider',
  version: '2.0.0',
  methods: {
    testBasicType() {
      return [
        java.combine('com.alibaba.dubbo.demo.TypeRequest', {
          map: java.Map({name: 'test'}),
          bigDecimal: java.BigDecimal('1000.0000'),
        }),
      ];
    },
  },
});

const errorService = dubbo.proxyService({
  dubboInterface: 'com.alibaba.dubbo.demo.ErrorProvider',
  version: '1.0.0',
  methods: {
    errorTest() {
      return [];
    },
  },
});

module.exports = {
  demoService,
  errorService,
  basicTypeService,
};

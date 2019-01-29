const {java} = require('dubbo2.js');

const provider = (module.exports = {});

provider.demoProvider = dubbo =>
  dubbo.proxyService({
    dubboInterface: 'com.alibaba.dubbo.demo.DemoProvider',
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

provider.basicTypeProvider = dubbo =>
  dubbo.proxyService({
    dubboInterface: 'com.alibaba.dubbo.demo.BasicTypeProvider',
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

provider.errorProvider = dubbo =>
  dubbo.proxyService({
    dubboInterface: 'com.alibaba.dubbo.demo.ErrorProvider',
    methods: {
      errorTest() {
        return [];
      },
    },
  });

const restify = require('restify');
const {Dubbo, java} = require('dubbo');

const dubbo = new Dubbo({
  application: {name: 'dubbo-directly-test'},
  register: 'localhost:2181',
  dubboVersion: '2.0.0',
  interfaces: ['com.alibaba.dubbo.demo.DemoService'],
});

const demoService = dubbo.proxyService({
  dubboInterface: 'com.alibaba.dubbo.demo.DemoService',
  version: '0.0.0',
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

const server = restify.createServer({
  name: 'myapp',
  version: '1.0.0',
});

server.get('/user', async (req, res, next) => {
  const result = await demoService.getUserInfo();
  res.json(result);
  next();
});

server.get('/echo', async (req, res, next) => {
  console.log(req.url);
  const result = await demoService.echo();
  console.log(result);
  res.json({
    res: result.res,
    err: result.err ? result.err.message : null,
  });
  next();
});

server.get('/hello', (req, res, next) => {
  res.send('hello world');
  next();
});

server.listen(3000);
console.log('starting 3000');

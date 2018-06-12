const http = require('http');
const dubbo = require('./dubbo/dubbo');

const app = http.createServer(async (req, res) => {
  const hello = await dubbo.service.demoProvider.sayHello();
  res.end(hello.res);
});

app.listen(3000);
console.log('server was running at port 3000');

const http = require('http');
const {demoProvider} = require('./dubbo');

const app = http.createServer(async (req, res) => {
  const hello = await demoProvider.sayHello();
  res.end(hello.res);
});

app.listen(3000);
console.log('server was running at port 3000');

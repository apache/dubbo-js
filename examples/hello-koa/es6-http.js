const http = require('http');
const dubbo = require('./dubbo/dubbo-es6');

const app = http.createServer((req, response) => {
  if (req.url === '/dubbo') {
    dubbo.service.demoProvider.echo().then(({res, err}) => {
      response.end(res);
    });
  }
});

app.listen(3000);
console.log('starting...');

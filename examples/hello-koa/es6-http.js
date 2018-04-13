const http = require('http');
// const {Dubbo, java} = require('dubbo2.js');
const {demoService, basicTypeService} = require('./dubbo-es6');

const app = http.createServer((req, response) => {
  if (req.url === '/dubbo') {
    demoService.echo().then(({res, err}) => {
      response.end(res);
    });
  }
});

app.listen(3000);
console.log('starting...');

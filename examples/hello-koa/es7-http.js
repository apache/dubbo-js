const http = require('http');
const uuid = require('uuid/v1');
const {zoneContext} = require('dubbo2.js');
const {demoService, basicTypeService} = require('./dubbo');

let i = 0;

const app = http.createServer(async (req, response) => {
  zoneContext.setRootContext('uuid', uuid());
  if (req.url === '/dubbo') {
    const {res} = await demoService.echo();
    response.end(res);
  }
});

app.listen(3000);
console.log('starting...');

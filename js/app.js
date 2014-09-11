var http = require('http');
var url = require('url');
var msg = require('./lib/msg');
var dubbo = require('./lib/dubbo');

http.createServer(function(req, res) {
    console.log(req.url);
    var cmd = url.parse(req.url, false).cmd;
    msg.emit('cmd', cmd);

    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('hello world');
}).listen(3000);

console.log('app is running at http://localhost:3000')


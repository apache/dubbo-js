var net = require('net');
var msg = require('./msg')

var dubbo = {
    host: 'localhost',
    port: 20880
};

var client = net.connect(dubbo, function() {
   console.log('connect dubbo....') 
});

client.on('data', function(data) {
    console.log(data.toString())
})

client.on('end', function() {
    console.log("disconnect")
})

msg.on('cmd', function(cmd) {
    if (client) {
	client.write(cmd + '\r\n')
    } 
})


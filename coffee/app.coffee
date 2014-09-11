http = require 'http'
dubbo = require './lib/dubbo'
msg = require './lib/msg'
url = require 'url'


http.createServer (req, res) ->
	console.log req.url
	cmd = url.parse(req.url, true).cmd

	msg.emit 'cmd', cmd

	res.writeHead 200, {'Content-Type': 'text/html'}
	res.end "<h1>hello dubbo service</h1>"
.listen 3000

console.log 'app is running at http://localhost:3000'

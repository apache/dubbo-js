net = require 'net'
msg = require './msg'

#dubbo config
dubbo = 
	host: 'localhost'
	port: 20880

#connect dubbo tcp server
client = net.connect host, ->
	console.log 'connect dubbo'

client.on 'data', (data) ->
	console.log data.toString()

client.on 'end', ->
	console.log 'disconnect'

#bind customize event
msg.on 'cmd', (cmd) ->
	client?.write '#{cmd}\r\n'
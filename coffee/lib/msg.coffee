events = require 'events'


###
	通过全局的事件机制，可以做到消息到就控制tcp的write数据
###
module.exports = exports = new events.EventEmitter()
# node-jsonrpc-dubbo

终于在祖鹏和文武的努力下，我们的dubbo可以暴露jsonrpc协议了。

这对于我们web端的小伙伴来说，真是喜大普奔的事情。必须鼎力支持。


从此开启web端快速进化之旅，无论是当红炸子鸡nodejs，还是沉稳健壮大python，亦或者Golang，从此八仙过海，
各显神通。


当然我们现在要先解决nodejs的问题。

## TODO List

1. node可以连接zookkeeper，根据/dubbo的path，获取所有的provider，然后进入provider，获取真正的提供者url eg.
   path=/dubbo/com.ofpay.demo.api.UserProvider/providers,
   
2. 根据提供者的信息，过滤出jsonrpc://协议的provider，解析url，获取host:port/path method param

3. 通过jsonrpc去调用method

4. 获取注册中心的信息，然后本地缓存配置信息，然后订阅zk的更新，如果有更新重新生成缓存文件

5. 一个服务可能有多个提供者(集群)，现在先随机调度到其中一个。



## To be continue

1. 按需缓存provider的元数据，而不是一下子全sync到client端

2. provider的调用支持version, group

3. 接收zookeeper的更新通知，刷新本地provider缓存

4. 写入consumer信息


## usage

更符合node的使用方式和思维习惯


```javascript

var client = require('./dubbo-client');


var provider = 'com.ofpay.demo.api.UserProvider';

//简单的调用一个接口
client.getProvider(provider, function(err, userProvider) {
  err
    ? console.log(err)
    : userProvider.queryAll(function(err, data) {console.log(err, data);});
});


//group version support
client.getProvider(provider, 'test1', '2.1', function (err, userProvider) {
  err
    ? console.log(err)
    : userProvider.queryAll(function(err, data) {console.log(err, data);});
});

```
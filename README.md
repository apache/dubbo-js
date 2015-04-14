# node-jsonrpc-dubbo

终于在祖鹏和文武的努力下，我们的dubbo可以暴露jsonrpc协议了。

这对于我们web端的小伙伴来说，真是喜大普奔的事情。必须鼎力支持。


从此开启web端快速进化之旅，如果是nodejs还是大python，亦或者Golang，从此八仙过海，
各显神通。


当然我们现在要先解决nodejs的问题。

## TODO List

1. node可以连接zookkeeper，根据/dubbo的path，获取所有的provider，然后进入provider，获取真正的提供者url eg.
   path=/dubbo/com.ofpay.demo.api.UserProvider/providers,
   
2. 根据提供者的信息，过滤出jsonrpc://协议的provider，解析url，获取host:port/path method param

3. 通过jsonrpc去调用method

4. 获取注册中心的信息，然后本地缓存配置信息，然后订阅zk的更新

5. 一个服务可能有多个提供者(集群)，现在先随机调度到其中一个。
# Release Notes

## 4.0.1

[enhancement]

- Improve the port reuse mechanism of beehive-service
- Improve the frequency of tcp reconnection, faster frequency
- redesign beehive-consumer, beehive-service config api
- Add periodic refresh dubbo-cluster capability

[fixed]

- Fix the reset bug of the retry module
- Fix beehive-service registry url

## 4.0.0

![image](https://user-images.githubusercontent.com/533008/124376606-67f4a680-dcda-11eb-91b9-96933828bf42.png)

After long-term community feedback and collaboration, and thanks to the efforts of the vivo open source collaboration team, we finally ushered in the release of apache dubbo-js 4.0.0.

dubbo-js 4.0.0 will be a new milestone. We have made major software architecture adjustments and provided full-stack dubbo service capabilities. Dubbo/dj, which is under construction, will help the zero development of framework code by building a small cross-language DSL language for dubbo.

In the process of building dubbo-js, we adhere to the consistent principle.

1. Keep it simple and stupid. We want to keep dubbo-js easy to use, easy to learn, and reduce mental burden and learning cost.

2. Build tools for humans. Development experience is as important as user experience. We strive to keep API design simple, intuitive and ergonomic. We use typescript to bring type hints, code completion, and type checking to help development become more efficient. We have built [interpret] and the dubbo/dj under development to make our calls and docking between JavaScript, Go, and Java seamless.

3. High performance and observable.

### Arch

![image](https://user-images.githubusercontent.com/533008/124376584-43003380-dcda-11eb-9917-8c8d439b1edb.png)

### change log

- Separate modules, refactor code, simplify implementation logic, and remove unnecessary defensive programming
- Zookeeper's node underlying library is replaced with zookeeper's native c implementation, replacing the existing node-zookeeper-client
- The ability to dynamically configure dubbo-consumer/dubbo-service meta data
- dubbo-service automatically realizes load balancing
- Support the use of node10+ and above
- Incorporate the implementation of the latest version of zone-context, more accurate memory recovery, and safer link tracking
- Add dubbo-test full-process integration test
- add fullstack example
- Improve the unit test, run the unit test through mock without relying on any environment zookeeper etc.
- Build a zookeeper mock, and use js to simulate a fully compatible zookeeper for unit testing, decoupling the dependence of unit testing on the environment

- The core modules are re-split, abstracted into five core modules: consumer, server, registry, setting, and common
- Added dubbo-server module to provide a complete basic capability of dubbo tcp server service
- Added dubbo-server to accept dubbo requests, serialization and deserialization of request parameters
- Added service registration capability, register to zookeeper and nacos
- Enhance scheduling of requests by the scheduler, adopt the concept of fast error, improve error information, and be more precise
- Enhance the underlying debug log of dubbo-server to facilitate quick location of problems
- Enhance the dubbo url of dubbo-server registered to zk, add side, pid, generic, protocol, dynamic, category, anyhost, timestamp and other parameters
- Enhanced extension dubbo-server supports middleware middleware mechanism, which can extend the life cycle of the entire call
- Refactor the serialization implementation of dubbo requests and responses to keep consistent with the upstream version
- Add an independent heartbeat management module to simplify the communication between consumer and server
- Added nacos as the registration center

### 【Bug fix】

- Fix serialization of decodeDubboResponse of dubbo-consumer and deserialization of err object of error response
- Repair the heartbeat mechanism between the consumer and the server to avoid a large number of heartbeat storms. At present, The server will reply immediately after receiving the heartbeat, and the consumer will check and send periodically.
- Fix the version setting of dubboVersion of dubbo-consumer, this version should be the protocol version of dubbo protocal, not the version of dubbo library

## 3.0.0

After accepting the community's pr for a long time, we are ready to release dubbo-js@3.0.0

@creasy2010
@hsiaosiyuan0
@sunchuanleihit
@ralf0131  
@binlaniua
@jasonjoo2010
@wushanchao
@AtarisMio
@hufeng

**Thank you very much**

### Bugfixes

- Fix zookeeper automatic reconnection stability problem<https://github.com/apache/dubbo-js/pull/140> @binlaniua
- fix network break, heart beat check not work](https://github.com/apache/dubbo-js/pull/139) @binlaniua
- dubbo.subcribe -> dubbo.subscribe<https://github.com/apache/dubbo-js/pull/125> @wushanchao
- bugfix consumer register ignore zkRoot]<https://github.com/apache/dubbo-js/pull/94> by @sunchuanleihit
- fixed when zk getChildren had occured error set \_dubboServiceUrlMap interface is [] <https://github.com/apache/dubbo-js/pull/121> @hufeng
- remove dumplicate consumer url<https://github.com/apache/dubbo-js/pull/96> by @sunchuanleihit
- bugfix decode-buffer return DataType.Data<https://github.com/apache/dubbo-js/pull/144> @sunchuanleihit
- dubboUrl get default.group<https://github.com/apache/dubbo-js/pull/138> @sunchuanleihit
- fix beginning steps<https://github.com/apache/dubbo-js/pull/120> @hsiaosiyuan0
- Repair reconnection should not empty existing provider<https://github.com/apache/dubbo-js/pull/157> @binlaniua
- fixed unit test<https://github.com/apache/dubbo-js/pull/155> @hufeng
- Free time heartbeat<https://github.com/apache/dubbo-js/pull/156> @sunchuanleihit
- when Zookeeper ready and await dubbo.ready () would stop<https://github.com/apache/dubbo-js/pull/153> @sunchuanleihit
- decode-buffer Fault tolerance<https://github.com/apache/dubbo-js/pull/152> @sunchuanleihit
- filter private field where compiler java interface to typescript<https://github.com/apache/dubbo-js/pull/151> @AtarisMio
- fixed test suite and document<https://github.com/apache/dubbo-js/pull/143> @hufeng

### Enhancement

- Make it subscribing all possible targets when set version to '\*' or empty<https://github.com/apache/dubbo-js/pull/129> @jasonjoo2010
- split registry module and extend Dubbo register](https://github.com/apache/dubbo-js/pull/117) @hufeng
- dubbo-invoker add cache<https://github.com/apache/dubbo-js/pull/110> @hufeng @sunchuanleihit
- support include in dubbo.json to specify provider interfaces<https://github.com/apache/dubbo-js/pull/103> @sunchuanleihit
- Add zookeeper auth supports<https://github.com/apache/dubbo-js/pull/132> @xusd320
- Update readme<https://github.com/apache/dubbo-js/pull/119> @hsiaosiyuan0
- add zookeeper traceError and modify zk factory method name<https://github.com/apache/dubbo-js/pull/159> @hufeng

# Release Notes

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

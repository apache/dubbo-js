import * as debug from 'debug';
import queue from './queue';
import {uuid} from './request-id';
import Scheduler from './scheduler';
import {IDubboProps, IDubboProvider} from './types';
import {to} from './to';

const SERVICE_CALL_TIME_OUT = 20 * 1000;

//record dubbo log
const log = debug('dubbo:bootstrap');

//定位没有处理的promise
process.on('unhandledRejection', (reason, p) => {
  console.log(reason, p);
});

/**
 * Dubbo
 *
 * 1. 连接注册中心zookeeper
 * 2. 发起远程dubbo provider的方法调用
 * 3. 序列化/反序列化dubbo协议
 * 4. 管理tcp连接以及心跳
 * 5. 通过代理机制自动代理interface对应的方法
 * 6. 提供直连的方式快速测试接口
 */
export class Dubbo {
  constructor(props: IDubboProps) {
    this._props = props;

    log('getting started...');
    log(`initial properties: ${JSON.stringify(props, null, 2)}`);

    //TODO 将来支持直连，就跳过socketSchedule，直接连接

    const {zkRoot, register, application, interfaces} = this._props;
    Scheduler.from({
      zkRoot,
      register,
      application,
      interfaces,
    });
  }

  private _props: IDubboProps;

  proxyService = <T>(provider: IDubboProvider): T => {
    const {dubboVersion} = this._props;
    const {dubboInterface, methods, version, timeout, group} = provider;
    const proxyObj = Object.create(null);

    //proxy methods
    Object.keys(methods).forEach(name => {
      proxyObj[name] = async function(...args: any[]) {
        const originMethod = methods[name];
        const methodArgs = originMethod.call(provider, ...args) || [];
        const requestId = uuid();
        //timeout check
        const timeId = setTimeout(() => {
          log(`${dubboInterface} method: ${name} invoke timeout`);
          queue.failed(requestId, new Error('remote invoke timeout'));
        }, SERVICE_CALL_TIME_OUT);

        const result = await to(
          queue.add(requestId, {
            args: {
              requestId,
              dubboVersion,
              dubboInterface,
              methodName: name,
              methodArgs,
              version,
              timeout,
              group,
            },
          }),
        );

        clearTimeout(timeId);
        return result;
      };
    });

    return proxyObj;
  };
}

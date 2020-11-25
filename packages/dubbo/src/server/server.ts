/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import net, {Socket} from 'net';
import qs from 'querystring';
import ip from 'ip';
import debug from 'debug';
import {decodeDubboRequest} from '../serialization/decode-hessian2';
import {DubboResponseEncoder} from '../serialization/encode-hessian2';
import zk from '../registry/zookeeper';
import HeartBeat from '../serialization/heartbeat';
import DecodeBuffer from '../serialization/decode-buffer';
import ResponseContext, {ResponseStatus} from './response-context';
import Request from '../serialization/request';
import compose from 'koa-compose';

import {
  IDubboProviderRegistryProps,
  IDubboServerProps,
  IDubboService,
  IZkClientProps,
  Middleware,
} from '../types';

const log = debug('dubbo-server');

type DubboServiceClazzName = string;

export default class DubboServer {
  private _port: number;
  private _server: net.Server;
  private _registry: IZkClientProps | string | Function;
  private _services: Array<IDubboService>;
  private _serviceMap: Map<DubboServiceClazzName, IDubboService>;
  private readonly _middlewares: Array<Middleware<ResponseContext>>;

  constructor(props: IDubboServerProps) {
    log('init dubbo-server with: %O', props);

    const {port, services} = props;
    this._port = port || 20880;
    this._registry = props.registry;
    this._middlewares = [];
    this._services = services || [];
    this._serviceMap = new Map();
  }

  public static from(props: IDubboServerProps) {
    return new DubboServer(props);
  }

  start = () => {
    // TODO 完善promise机制
    log('start dubbo-server with port %d', this._port);
    this._server = net
      .createServer(this._handleSocketRequest)
      .listen(this._port, () => {
        this._registerServices();
      });
  };

  close() {
    this._server &&
      this._server.close(() => {
        log(`server was closed`);
      });
  }

  /**
   * extends middleware
   * @param fn
   */
  use(fn: Middleware<ResponseContext>) {
    if (typeof fn != 'function') {
      throw new TypeError('middleware must be a function');
    }
    log('use middleware %s', (fn as any)._name || fn.name || '-');
    this._middlewares.push(fn);
    return this;
  }

  private _handleSocketRequest = (socket: Socket) => {
    // init heartbeat
    const heartbeat = HeartBeat.from({
      type: 'response',
      transport: socket,
      onTimeout: () => socket.destroy(),
    });

    DecodeBuffer.from(socket).subscribe(async data => {
      if (HeartBeat.isHeartBeat(data)) {
        log(`receive socket client heartbeat`);
        heartbeat.emit();
        return;
      }
      const ctx = await this._invokeRequest(data);
      heartbeat.setWriteTimestamp();
      socket.write(new DubboResponseEncoder(ctx).encode());
    });
  };

  private async _invokeRequest(data: Buffer) {
    const request = decodeDubboRequest(data);
    const service = this.matchService(request);
    const context = new ResponseContext(request);

    const {
      methodName,
      attachment: {path, group, version},
    } = request;

    // service not found
    if (!service) {
      context.status = ResponseStatus.SERVICE_NOT_FOUND;
      context.body.err = new Error(
        `Service not found with ${path} and ${methodName}, group:${group}, version:${version}`,
      );
      return context;
    }

    const middlewares = [
      ...this._middlewares,
      async function handleRequest(ctx: ResponseContext) {
        const method = service.methods[request.methodName];
        ctx.status = ResponseStatus.OK;
        let err = null;
        let res = null;
        try {
          res = await method.apply(service, [...(request.args || []), ctx]);
        } catch (error) {
          err = error;
        }
        ctx.body = {
          res,
          err,
        };
      },
    ];

    log('middleware->', middlewares);
    const fn = compose(middlewares);

    try {
      await fn(context);
    } catch (err) {
      log(err);
      context.status = ResponseStatus.SERVER_ERROR;
      context.body.err = err;
    }
    return context;
  }

  private _registerServices() {
    const services = this._services;
    // init serviceMap
    for (let service of services) {
      this._serviceMap.set(service.clazz, service);
    }

    const registryService = [];

    for (let service of services) {
      // compose dubbo url
      // dubbo://127.0.0.1:3000/org.apache.dubbo.js.HelloWorld?group=fe&version=1.0.0&method=sayHello,sayWorld
      const url = this._urlBuilder(service);
      // write to zookeeper
      registryService.push([service.clazz, url]);
    }

    const registyFactory = this._getRegistryFactory();
    registyFactory({
      type: 'provider',
      services: registryService,
    });
  }

  private _urlBuilder(service: IDubboService) {
    const ipAddr = ip.address();
    const {clazz, group = '', version, methods} = service;
    const methodName = Object.keys(methods).join();

    return encodeURIComponent(
      `dubbo://${ipAddr}:${this._port}/${clazz}?` +
        qs.stringify({
          group,
          version,
          method: methodName,
          side: 'provider',
          pid: process.pid,
          generic: false,
          protocal: 'dubbo',
          dynamic: true,
          category: 'providers',
          anyhost: true,
          timestamp: Date.now(),
        }),
    );
  }

  private _getRegistryFactory(): (props: IDubboProviderRegistryProps) => void {
    // if (isString(this._registry) && this._registry.startsWith('zk://')) {
    //   return zk({url: this._registry});
    // } else if (
    //   isObject(this._registry) &&
    //   this._registry.url.startsWith('zk://')
    // ) {
    //   return zk(this._registry);
    // } else if (isFunction(this._registry)) {
    //   return this._registry;
    // }
    return zk({url: this._registry as string});
  }

  private matchService(request: Request) {
    const {methodName} = request;
    const {
      attachment: {path, group, version},
    } = request;

    const service = this._serviceMap.get(path);
    if (
      !service ||
      (service.methods[methodName] === undefined ||
        service.group !== group ||
        service.version !== version)
    ) {
      return null;
    }
    return service;
  }
}

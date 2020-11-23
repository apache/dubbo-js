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

import net from 'net';
import qs from 'querystring';
import ip from 'ip';
import debug from 'debug';
import {decodeDubboRequest} from '../serialization/decode-hessian2';
import {DubboResponseEncoder} from '../serialization/encode-hessian2';
import zk from '../registry/zookeeper';
import {
  IDubboProviderRegistryProps,
  IDubboServerProps,
  IDubboService,
  IZkClientProps,
} from '../types';
import HeartBeat from '../serialization/heartbeat';
import DecodeBuffer from '../serialization/decode-buffer';

const log = debug('dubbo-server');

type DubboServiceClazzName = string;

export default class DubboServer {
  private _port: number;
  private _registry: IZkClientProps | string | Function;
  private _services: Array<IDubboService>;
  private _serviceRoute: Map<DubboServiceClazzName, IDubboService>;
  private _server: net.Server;
  private _heartBeat: HeartBeat;

  constructor(props: IDubboServerProps) {
    log('init dubbo-server with: %O', props);

    const {port, services} = props;
    this._port = port || 20880;
    this._registry = props.registry;
    this._services = services || [];
    this._serviceRoute = new Map();
  }

  public static from(props: IDubboServerProps) {
    return new DubboServer(props);
  }

  start() {
    // TODO 完善promise机制
    log('start dubbo-server with port %d', this._port);
    this._server = net
      .createServer(socket => {
        // init heartbeat
        this._heartBeat = HeartBeat.from({
          label: 'dubbo-server',
          transport: socket,
          onTimeout: () => socket.destroy(),
        });

        // allocate decodeBuff to each socket connection
        const decodeBuff = new DecodeBuffer();
        decodeBuff.subscribe(this._subscribeDecodeBuff(socket));

        socket
          .on('data', data => {
            decodeBuff.receive(data);
          })
          .on('close', () => {
            log('socket close');
            decodeBuff.clearBuffer();
          });
      })
      .listen(this._port, () => {
        this._registerServices();
      });
  }

  close() {
    this._server &&
      this._server.close(() => {
        log(`server was closed`);
      });
  }

  private _subscribeDecodeBuff = (socket: net.Socket) => (data: Buffer) => {
    // if current request is heartbeat, reply heartbeat
    if (HeartBeat.isHeartBeat(data)) {
      log(`receive socket client heartbeat`);
      // send heartbeat
      this._heartBeat.emit();
      return;
    }

    // TODO code review
    // decode dubbo request
    const {requestId, methodName, dubboInterface, args} = decodeDubboRequest(
      data,
    );

    // TODO methodName判断是不是存在
    // 不存在 就报ServiceNotFound with path methodName
    const service = this._serviceRoute.get(dubboInterface);
    const fn = service.method[methodName];
    const ret = fn.apply(service, args);
    log(`receive dubbo request, decode params:=>`, {
      requestId,
      methodName,
      dubboInterface,
      args,
      data,
    });

    // update heartbeat lastWriteTimeStamp
    this._heartBeat.setWriteTimestamp();

    // send response
    socket.write(
      new DubboResponseEncoder({
        isHeartbeat: false,
        status: 20,
        data: ret,
        requestId,
      }).encode(),
    );
  };

  private _registerServices() {
    const services = this._services;
    // init serviceMap
    for (let service of services) {
      this._serviceRoute.set(service.clazz, service);
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
    const {clazz, group = '', version, method} = service;
    const methodName = Object.keys(method).join();

    return encodeURIComponent(
      `dubbo://${ipAddr}:${this._port}/${clazz}?` +
        qs.stringify({
          group,
          version,
          method: methodName,
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
}

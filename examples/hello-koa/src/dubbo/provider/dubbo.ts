import {DubboServer} from 'apache-dubbo-js';
import service from './service';

const server = new DubboServer({
  port: 20880,
  // default zookeeper
  registry: 'localhost:2181',
  services: service,
});

server.start();

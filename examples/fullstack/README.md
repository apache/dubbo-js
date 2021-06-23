# fullstack demo

# getting started

```sh
cd dubbo-js

# install dependencies
yarn

# build all modules
make

cd examples/fullstack

# start service with zookeeper registry
yarn run hello-service:zk
yarn run hello-api:zk

curl http://localhost:3000

# start service with nacos registry
yarn run hello-service:nacos
yarn run hello-service:nacos

curl http://localhost:6000
```

import SocketWorker from '../socket-worker';

// 测试启动后，过一会关闭wifi, 过20次的心跳间隔，会关闭socket, 重新创建连接
const worker = SocketWorker.from('47.110.39.117:8888');
console.log(worker);

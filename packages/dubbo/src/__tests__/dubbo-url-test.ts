import DubboUrl from '../dubbo-url';

describe('dubbo url test suite', () => {
  it('test basic api', () => {
    const url = DubboUrl.from(
      'dubbo://172.19.36.38:20880/com.alibaba.dubbo.demo.DemoProvider?anyhost=true&application=demo-provider&dubbo=2.5.7&generic=false&interface=com.alibaba.dubbo.demo.DemoProvider&methods=sayHello,test,echo,getUserInfo&pid=23327&revision=1.0.0&side=provider&timeout=10000&timestamp=1526972402854&version=1.0.0',
    );

    expect(url.host).toEqual('172.19.36.38');
    expect(url.port).toEqual(20880);
    expect(url.path).toEqual('com.alibaba.dubbo.demo.DemoProvider');
    expect(url.dubboVersion).toEqual('2.5.7');
    expect(url.version).toEqual('1.0.0');
    expect(url.group).toEqual('');
  });
});

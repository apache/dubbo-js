package com.alibaba.dubbo.demo.consumer;

import com.alibaba.dubbo.demo.*;

import org.springframework.context.support.ClassPathXmlApplicationContext;

/**
 * Created by ken.lj on 2017/7/31.
 */
public class Consumer {

    public static void main(String[] args) {
        ClassPathXmlApplicationContext context = new ClassPathXmlApplicationContext(new String[]{"META-INF/spring/dubbo-demo-consumer.xml"});
        context.start();

//        DemoProvider demoService = (DemoProvider) context.getBean("demoService"); // 获取远程服务代理
////        String hello = demoService.sayHello("world"); // 执行远程方法
//
////        System.out.println(hello); // 显示调用结果
//
//        String res = demoService.echo();
//
//        System.out.println(res);
//
//        UserRequest request = new UserRequest();
//        request.setId(1);
//        request.setEmail("test@qianimi.com");
//        request.setName("node-dubbo");
//
//        UserResponse userInfo = demoService.getUserInfo(request);
//        System.out.println(userInfo);

        BasicTypeProvider basicTypeService = (BasicTypeProvider) context.getBean("basicTypeService");
        System.out.println(basicTypeService.testBasicType(new TypeRequest()));

        try {
            Thread.sleep(30000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
}

package com.alibaba.dubbo.demo.provider;

import com.alibaba.dubbo.demo.BasicTypeProvider;
import com.alibaba.dubbo.demo.TypeRequest;

public class BasicTypeServiceImpl implements BasicTypeProvider {
    @Override
    public TypeRequest testBasicType(TypeRequest request) {
        return request;
    }
}

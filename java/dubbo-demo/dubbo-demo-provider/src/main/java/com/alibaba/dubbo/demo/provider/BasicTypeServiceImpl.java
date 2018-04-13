package com.alibaba.dubbo.demo.provider;

import com.alibaba.dubbo.demo.BasicTypeService;
import com.alibaba.dubbo.demo.TypeRequest;

import java.util.Map;

public class BasicTypeServiceImpl implements BasicTypeService{
    @Override
    public TypeRequest testBasicType(TypeRequest request) {
        return request;
    }
}

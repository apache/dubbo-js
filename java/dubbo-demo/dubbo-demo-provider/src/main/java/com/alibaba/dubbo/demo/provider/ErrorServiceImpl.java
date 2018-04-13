package com.alibaba.dubbo.demo.provider;

import com.alibaba.dubbo.demo.CustomizeException;
import com.alibaba.dubbo.demo.ErrorService;

public class ErrorServiceImpl implements ErrorService{
    @Override
    public void errorTest() throws CustomizeException {
        throw new CustomizeException("exception");
    }
}

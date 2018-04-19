package com.alibaba.dubbo.demo.provider;

import com.alibaba.dubbo.demo.CustomizeException;
import com.alibaba.dubbo.demo.ErrorProvider;

public class ErrorProviderImpl implements ErrorProvider {
    @Override
    public void errorTest() throws CustomizeException {
        throw new CustomizeException("exception");
    }
}

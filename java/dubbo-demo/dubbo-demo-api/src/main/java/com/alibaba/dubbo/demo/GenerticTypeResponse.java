package com.alibaba.dubbo.demo;

import java.io.Serializable;
import java.util.List;

/**
 * Created by master on 21/11/2017.
 */
public class GenerticTypeResponse<T> implements Serializable {
    private List<T> list;

    public List<T> getList() {
        return list;
    }

    public void setList(List<T> list) {
        this.list = list;
    }

    @Override
    public String toString() {
        return "GenerticTypeResponse{" +
                "list=" + list +
                '}';
    }
}

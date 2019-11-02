package com.alibaba.dubbo.demo;

import java.io.Serializable;
import java.util.Map;

/**
 * Created by master on 21/11/2017.
 */
public class UserResponse implements Serializable {
    private String status;
    private Map<String, String> info;
    private Map<Long, String> orders;

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Map<String, String> getInfo() {
        return info;
    }

    public void setInfo(Map<String, String> info) {
        this.info = info;
    }

    public Map<Long, String> getOrders() {
        return orders;
    }

    public void setOrders(Map<Long, String> orders) {
        this.orders = orders;
    }

    @Override
    public String toString() {
        return "UserResponse{" +
                "status='" + status + '\'' +
                ", info=" + info +
                ", orders=" + orders +
                '}';
    }
}

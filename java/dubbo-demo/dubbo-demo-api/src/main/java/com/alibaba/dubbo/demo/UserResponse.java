package com.alibaba.dubbo.demo;

import java.io.Serializable;
import java.util.Map;

/**
 * Created by master on 21/11/2017.
 */
public class UserResponse implements Serializable {
    private String status;
    private Map<String, String> info;

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

    @Override
    public String toString() {
        return "UserResponse{" +
                "status='" + status + '\'' +
                ", info=" + info +
                '}';
    }
}

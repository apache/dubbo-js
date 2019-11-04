package com.alibaba.dubbo.demo;

import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;

/**
 * Created by master on 21/11/2017.
 */
public class UserResponse implements Serializable {
    private String status;
    private Map<String, String> info;
    private GenerticTypeResponse<Long> list;
    private HashMap<String, String> some;

    public String getStatus() {
        return status;
    }

    public HashMap<String, String> getSome() {
        return some;
    }

    public void setSome(HashMap<String, String> some) {
        this.some = some;
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

    public GenerticTypeResponse<Long> getList() {
        return list;
    }

    public void setList(GenerticTypeResponse<Long> list) {
        this.list = list;
    }

    @Override
    public String toString() {
        return "UserResponse{" +
                "status='" + status + '\'' +
                ", info=" + info +
                ", list=" + list +
                '}';
    }
}

package com.alibaba.dubbo.demo;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Map;

public class TypeRequest implements Serializable {
    private Map<String, String> map;

    private BigDecimal bigDecimal;

    public Map<String, String> getMap() {
        return map;
    }

    public void setMap(Map<String, String> map) {
        this.map = map;
    }

    public BigDecimal getBigDecimal() {
        return bigDecimal;
    }

    public void setBigDecimal(BigDecimal bigDecimal) {
        this.bigDecimal = bigDecimal;
    }
}

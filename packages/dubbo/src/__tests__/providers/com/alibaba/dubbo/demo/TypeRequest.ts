import java from 'js-to-java';

//generate by interpret-cli dubbo2.js

export interface ITypeRequest {
  bigDecimal?: {value: string};
  map?: {[name: string]: string};
}

export class TypeRequest {
  bigDecimal?: {value: string};
  map?: {[name: string]: string};

  constructor(params: ITypeRequest) {
    this.bigDecimal = params.bigDecimal;
    this.map = params.map;
  }

  __fields2java() {
    let mapMapTransfer = new Map();
    for (let mapKey in this.map) {
      mapMapTransfer.set(java.String(mapKey), java.String(this.map[mapKey]));
    }
    return {
      $class: 'com.alibaba.dubbo.demo.TypeRequest',
      $: {
        bigDecimal: this.bigDecimal
          ? java.BigDecimal(this.bigDecimal.value)
          : null,
        map: java.Map(mapMapTransfer),
      },
    };
  }
}

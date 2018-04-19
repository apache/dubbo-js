import * as java from 'js-to-java';
import {argumentMap} from 'interpret-util';

export interface ITypeRequest {
  bigDecimal?: { value: string };
  map?: { [name: string]: string };
}

export class TypeRequest {
  constructor(params: ITypeRequest) {
    this.bigDecimal = params.bigDecimal;
    this.map = params.map;
  }

  bigDecimal?: { value: string };
  map?: { [name: string]: string };

  __fields2java() {
    let mapMapTransfer = new Map();
    for (let mapKey in this.map) {
      mapMapTransfer.set(java.String(mapKey), java.String(this.map[mapKey]));
    }
    return {
      $class: 'com.alibaba.dubbo.demo.TypeRequest',
      $: {
        bigDecimal: java.BigDecimal(this.bigDecimal.value),
        map: java.Map(mapMapTransfer),
      },
    };
  }
}

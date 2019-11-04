import java from 'js-to-java';

//generate by interpret-cli dubbo2.js

export interface IGenerticTypeResponse<T = any> {
  list?: Array<T>;
}

export class GenerticTypeResponse<T = any> {
  list?: Array<T>;

  constructor(params: IGenerticTypeResponse<T>) {
    this.list = params.list;
  }

  __fields2java() {
    return {
      $class: 'com.alibaba.dubbo.demo.GenerticTypeResponse',
      $: {
        list: this.list
          ? java.List(
              (this.list || []).map(paramItem => {
                return paramItem &&
                  (paramItem as {__fields2java?(): any})['__fields2java']
                  ? (paramItem as {__fields2java?(): any})['__fields2java']()
                  : paramItem;
              }),
            )
          : null,
      },
    };
  }
}

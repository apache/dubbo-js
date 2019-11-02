import java from 'js-to-java';

//generate by interpret-cli dubbo2.js

export interface IGenerticTypeResponse<
  T extends {__fields2java?(): any} = any
> {
  list?: Array<T>;
}

export class GenerticTypeResponse<T extends {__fields2java?(): any} = any> {
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
                return paramItem && paramItem['__fields2java']
                  ? paramItem['__fields2java']()
                  : paramItem;
              }),
            )
          : null,
      },
    };
  }
}

//src/main/java/org/apache/dubbo/remoting/exchange/Request.java

export interface IAttachment {
  path: string;
  interface: string;
  /**
   * interface version
   */
  version: string;
  /**
   * dubbo version
   */
  dubbo: string;
  group?: string;
  timeout?: number;
  name?: {
    application: {name: string};
  };
}

export default class Request {
  readonly requestId: number;
  /**
   * dubbo version
   */
  version: string;
  broken: boolean;
  data: Object | string;
  methodName: string;
  parameterTypeDesc: string;
  parameterTypes: Array<string>;
  args: Array<any>;
  attachment: IAttachment;

  constructor(requestId: number) {
    this.requestId = requestId;
    this.attachment = {} as IAttachment;
  }
}

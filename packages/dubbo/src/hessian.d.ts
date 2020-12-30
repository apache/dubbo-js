declare module 'hessian.js' {
  export interface JavaType {
    $class: string;
    $: any;
  }

  export class EncoderV2 {
    write(
      val:
        | number
        | boolean
        | null
        | string
        | Object
        | Map<string, any>
        | JavaType,
    ): void;
    byteBuffer: {
      _bytes: Buffer;
      _offset: number;
    };
  }

  export class DecoderV2 {
    constructor(buff: Buffer);
    read(): any;
    readNull(): null;
    readBool(): boolean;
    readInt(): number;
    readLong(): number;
    readDouble(): number;
    readDate(): Date;
    readObject(): Object;
    readMap(): Map<any, any>;
    readArray(): Array<any>;
    readList(): Array<any>;
    readRef(): Object;
  }
}

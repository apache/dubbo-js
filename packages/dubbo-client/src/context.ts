export default class Context {
  path: string
  method: Function
  args: Array<any>
  // final result
  body: any
  request: any
  constructor() {
    this.path = ''
    this.method = new Function()
    this.args = []
    this.body = {
      res: {},
      err: null
    }
    this.request = {
      requestId: 12
    }
  }

  getPath() {
    return this.path
  }

  setPath(path: string) {
    this.path = path
  }

  //

  get serialization() {
    return JSON.stringify({
      path: this.path,
      methodName: this.method,
      methodArgs: this.args
    })
  }
}

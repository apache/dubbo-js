export default class Context {
  private path: string
  private method: Function
  private args: Array<any>
  private body: any
  constructor() {
    this.path = ''
    this.method = ()=>{}
    this.args = []
    this.body = {
      res: {},
      err: null
    }
  }

  getPath() {
    return this.path
  }

  setPath(path: string) {
    this.path = path
    return this
  }


  get serialization() {
    return JSON.stringify({
      path: this.path,
      methodName: this.method,
      methodArgs: this.args
    })
  }
}

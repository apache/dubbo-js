import {java} from 'dubbo2.js';
import {Controller} from 'egg';
import {TypeRequest} from '../dubbo/providers/com/alibaba/dubbo/demo/TypeRequest';

export default class HomeController extends Controller {
  async index() {
    const {ctx} = this;
    ctx.body = await ctx.service.test.sayHi('egg');
  }

  async sayHello() {
    const {res, err} = await this.ctx.app.dubbo.service.DemoProvider.sayHello(
      java.String('hello from node world'),
    );

    this.ctx.body = err ? err.message : res;
  }

  async echo() {
    const {res, err} = await this.ctx.app.dubbo.service.DemoProvider.echo();
    this.ctx.body = err ? err.message : res;
  }

  async basicType() {
    const {
      res,
      err,
    } = await this.ctx.app.dubbo.service.BasicTypeProvider.testBasicType(
      new TypeRequest({
        bigDecimal: {value: '100.00'},
        map: {hello: 'hello'},
      }),
    );
    this.ctx.body = err ? err.message : res;
  }
}

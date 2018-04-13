const Koa = require('koa');
const Router = require('koa-router');
// const {tracer} = require('dubbo2.js');
const {demoService, basicTypeService, errorService} = require('./dubbo');

const app = new Koa();
const router = new Router();

router.get('/', ctx => {
  ctx.body = 'hello, dubbo.js';
});

router.get('/hello', async ctx => {
  const {res, err} = await demoService.sayHello('test');
  ctx.body = err ? err.message : res;
});

router.get('/user', async ctx => {
  const {res, err} = await demoService.getUserInfo();
  ctx.body = res || err.message;
});

router.get('/echo', async ctx => {
  ctx.body = await demoService.echo();
});

router.get('/type', async ctx => {
  const {res, err} = await basicTypeService.testBasicType();
  ctx.body = res;
});

router.get('/exp', async ctx => {
  const {err, res} = await errorService.errorTest();
  console.log(err);
  ctx.body = 'ok';
});

router.get('/tracer', async ctx => {
  const {res: hello} = await demoService.sayHello('test');
  const {res: userInfo} = await demoService.getUserInfo();

  setTimeout(async () => {
    await basicTypeService.testBasicType();
    process.nextTick(() => {
      demoService.getUserInfo();
    });
  });

  ctx.body = {
    hello,
    userInfo,
  };
});

app
  // .use(tracer)
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(3000);

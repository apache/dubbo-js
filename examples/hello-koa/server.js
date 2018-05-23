const Koa = require('koa');
const Router = require('koa-router');
// const {tracer} = require('dubbo2.js');
const {demoProvider, basicTypeProvider, errorProvider} = require('./dubbo');

const app = new Koa();
const router = new Router();

router.get('/', ctx => {
  ctx.body = 'hello, dubbo.js';
});

router.get('/hello', async ctx => {
  const {res, err} = await demoProvider.sayHello('test');
  ctx.body = err ? err.message : res;
});

router.get('/user', async ctx => {
  const {res, err} = await demoProvider.getUserInfo();
  ctx.body = res || err.message;
});

router.get('/echo', async ctx => {
  ctx.body = await demoProvider.echo();
});

router.get('/type', async ctx => {
  const {res, err} = await basicTypeProvider.testBasicType();
  ctx.body = res;
});

router.get('/exp', async ctx => {
  const {err, res} = await errorProvider.errorTest();
  console.log(err);
  ctx.body = 'ok';
});

router.get('/tracer', async ctx => {
  const {res: hello} = await demoProvider.sayHello('test');
  const {res: userInfo} = await demoProvider.getUserInfo();

  setTimeout(async () => {
    await basicTypeProvider.testBasicType();
    process.nextTick(() => {
      demoProvider.getUserInfo();
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

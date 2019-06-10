import Koa from 'koa';
import Router from 'koa-router';
import dubbo from './dubbo/dubbo';

const app = new Koa();
const router = new Router();

router.get('/', ctx => {
  ctx.body = 'hello, dubbo.js';
});

router.get('/hello', async ctx => {
  const {res, err} = await dubbo.service.demoProvider.sayHello('test');
  console.log(await dubbo.service.basicTypeProvider.testBasicType());
  ctx.body = err ? err.message : res;
});

router.get('/user', async ctx => {
  const {res, err} = await dubbo.service.demoProvider.getUserInfo();
  ctx.body = res || err.message;
});

router.get('/echo', async ctx => {
  ctx.body = await dubbo.service.demoProvider.echo();
});

router.get('/type', async ctx => {
  const {res, err} = await dubbo.service.basicTypeProvider.testBasicType();
  ctx.body = res;
});

router.get('/exp', async ctx => {
  const {err, res} = await dubbo.service.errorProvider.errorTest();
  console.log(err);
  ctx.body = 'ok';
});

router.get('/tracer', async ctx => {
  const {res: hello} = await dubbo.service.demoProvider.sayHello('test');
  const {res: userInfo} = await dubbo.service.demoProvider.getUserInfo();

  setTimeout(async () => {
    await dubbo.service.basicTypeProvider.testBasicType();
    process.nextTick(() => {
      dubbo.service.demoProvider.getUserInfo();
    });
  });

  ctx.body = {
    hello,
    userInfo,
  };
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(3000);

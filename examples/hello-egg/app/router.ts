import {Application} from 'egg';

export default (app: Application) => {
  const {controller, router} = app;

  router.get('/', controller.home.index);
  router.get('/hello', controller.home.sayHello);
  router.get('/echo', controller.home.echo);
  router.get('/basicType', controller.home.basicType);
};

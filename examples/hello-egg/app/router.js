'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const {router, controller} = app;
  router.get('/', controller.home.index);
  router.get('/echo', controller.home.echo);
  router.get('/user', controller.home.userInfo);
  router.get('/hello', controller.home.sayHello);
};

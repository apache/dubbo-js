'use strict';

const Controller = require('egg').Controller;
const demoService = require('./dubbo');

class HomeController extends Controller {
  async index() {
    this.ctx.body = 'hi, dubbo.js';
  }

  async echo() {
    const result = await demoService.echo();
    this.ctx.body = result;
  }

  async userInfo() {
    const result = await demoService.getUserInfo();
    this.ctx.body = result;
  }

  async sayHello() {
    const result = await demoService.sayHello('node');
    this.ctx.body = result;
  }
}

module.exports = HomeController;

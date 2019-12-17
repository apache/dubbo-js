/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Context, Dubbo, setting} from 'dubbo-js';
import {EggApplication} from 'egg';
import service from './service';

declare module 'egg' {
  export interface EggApplication {
    dubbo: Dubbo<typeof service>;
  }
}

// dubbo interface setting
const dubboSetting = setting
  .match(
    [
      'org.apache.dubbo.demo.DemoProvider',
      'org.apache.dubbo.demo.ErrorProvider',
    ],
    {
      version: '1.0.0',
    },
  )
  .match('org.apache.dubbo.demo.BasicTypeProvider', {version: '2.0.0'});

export default (app: EggApplication) => {
  // create a dubboo object
  const dubbo = new Dubbo<typeof service>({
    application: {name: 'node-egg-bff'},
    register: 'localhost:2181,localhost:2182,localhost:2183',
    service,
    dubboSetting,
  });

  dubbo.subscribe({
    onTrace(err) {
      console.log(err);
    },
  });

  // extends middleware
  dubbo.use(async (ctx: Context, next: any) => {
    const start = Date.now();
    await next();
    const end = Date.now();
    app.coreLogger.info(
      `${ctx.dubboInterface} was invoked, cost-time ${end - start}`,
    );
  });

  // mounted dubbo to app
  app.dubbo = dubbo;
};

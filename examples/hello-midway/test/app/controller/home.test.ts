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

/* tslint:disable */
const {app, assert} = require('midway-mock/bootstrap');
/* tslint:enable */

describe('test/app/controller/home.test.ts', () => {
  it('should assert', async () => {
    const pkg = require('../../../package.json');
    assert(app.config.keys.startsWith(pkg.name));
  });

  it('should GET /', () => {
    return app
      .httpRequest()
      .get('/')
      .expect('Welcome to midwayjs!')
      .expect(200);
  });
});

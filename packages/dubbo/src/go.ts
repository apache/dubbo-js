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

/**
 * 统一promise的错误处理机制
 * 在使用async/await的过程中，对于错误的处理，通常第一选择是try/catch,
 * 但是常常会出现nested try/catch，代码就不会那么优雅
 * 针对异常或者异常的处理有很多方式，命令式的try/catch, 函数式的Optional, Either
 * 还比如go的多返回值，
 * f, err := os.Open("filename.ext")
 * if err != nil {
 *     log.Fatal(err)
 * }
 * 虽然verbose但是足够简单，规则统一
 *
 * 所以在这里对promise的错误处理进行值的统一包装，以此来简化
 *
 * Usage:
 *   function test() {
 *     return new Promise((resolve, reject) => {
 *       setTimeout(() => {
 *        resolve('hello');
 *        //reject(new Error('error'))
 *       }, 200)
 *     })
 *   }
 *
 *  (async () => {
 *    const {res, err} = await to(test());
 *    console.log(res) ;// hello
 *    console.log(err); //Error('error')
 *   })();
 *
 * @param promise
 */

export function go<T>(promise: Promise<T>): Promise<{err: Error; res: T}> {
  return promise.then((res: T = null) => ({res, err: null})).catch(err => ({
    res: null,
    err,
  }));
}

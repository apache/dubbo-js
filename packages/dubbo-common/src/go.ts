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
 * Unified promise error handling mechanism
 * In the process of using async/await, for error handling, usually the first choice is try/catch,
 * But often there will be nested try/catch, the code will not be so elegant
 * There are many ways to deal with exceptions or exceptions, imperative try/catch, functional Optional, Either
 * For example, go's multiple return values,
 *
 *  f, err := os.Open("filename.ext")
 *    if err != nil {
 *    log.Fatal(err)
 *  }
 *
 * Although verbose is simple enough, the rules are unified
 *
 * So here is the unified packaging of the value of the promise error handling to simplify
 *
 * Usage:
 * function test() {
 *  return new Promise((resolve, reject) => {
 *    setTimeout(() => {
 *      resolve('hello');
 *      //reject(new Error('error'))
 *      }, 200)
 *    })
 *  }
 *
 * (async () => {
 *  const {res, err} = await to(test());
 *  console.log(res) ;// hello
 *  console.log(err); //Error('error')
 * })();
 *
 * @param promise
 */

export async function go<T>(
  promise: Promise<T>
): Promise<{ err: Error; res: T }> {
  try {
    const res = await promise
    return { res, err: null }
  } catch (err) {
    return {
      res: null,
      err
    }
  }
}

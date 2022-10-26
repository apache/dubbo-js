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

module.exports = {
  title: 'Dubbo-js',
  description: 'blazing Fast Node RPC framework',
  head: [['link', { rel: 'icon', type: 'image/png', href: '/logo.png' }]],
  themeConfig: {
    repo: 'apache/dubbo-js',
    logo: '/logo.png',
    docsDir: 'docs',
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Config', link: '/config/' }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/apache/dubbo-js' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          {
            text: 'Getting Started',
            link: '/guide/'
          }
        ]
      },
      {
        text: 'APIs',
        items: [
          {
            text: 'Dubbo-js API',
            link: '/api/'
          }
        ]
      },
      {
        text: 'Config',
        items: [
          {
            text: 'Dubbo-js Options',
            link: '/config/'
          }
        ]
      }
    ],
    editLink: {
      pattern: 'https://github.com/apache/dubbo-js/edit/dubbo3/docs/:path',
      text: 'Edit this page on GitHub'
    }
  }
}

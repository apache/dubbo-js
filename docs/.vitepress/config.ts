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
        collapsed: true,
        items: [
          {
            text: 'Introduce',
            link: '/guide/'
          },
          {
            text: 'Dubbo for Web',
            collapsed: true,
            items: [
              {
                text: 'Getting Started',
                link: '/guide/dubboForWEB/GettingStarted'
              },
              {
                text: 'Generating Code',
                link: '/guide/dubboForWEB/GeneratingCode'
              },
              {
                text: 'Using clients',
                link: '/guide/dubboForWEB/UsingClients'
              },
              {
                text: 'Errors',
                link: '/guide/dubboForWEB/Errors'
              },
              {
                text: 'Headers & trailers',
                link: '/guide/dubboForWEB/HeadersandTrailers'
              },
              {
                text: 'Cancellation & Timeouts',
                link: '/guide/dubboForWEB/CancellationandTimeouts'
              },
              {
                text: 'Interceptors',
                link: '/guide/dubboForWEB/Interceptors'
              },
              {
                text: 'Choosing a protocol',
                link: '/guide/dubboForWEB/Choosingaprotocol'
              },
              {
                text: 'Supported browsers & frameworks',
                link: '/guide/dubboForWEB/SupportedBrowsersandFrameworks'
              },
              {
                text: 'Common errors',
                link: '/guide/dubboForWEB/CommonErrors'
              },
              {
                text: 'Testing',
                link: '/guide/dubboForWEB/Testing'
              },
              {
                text: 'Get Requests and Caching',
                link: '/guide/dubboForWEB/GetRequestsandCaching'
              },
              {
                text: 'Server-Side Rendering (SSR)',
                link: '/guide/dubboForWEB/ServerSideRendering'
              },
              {
                text: 'Connect for TanStack Query',
                link: '/guide/dubboForWEB/ConnectForTanStackQuery'
              }
            ]
          },
          {
            text: 'Dubbo for Node.js',
            collapsed: true,
            items: [
              {
                text:"Getting started",
                link:"/guide/dubboForNode/GettingStarted"
              },
              {
                text:"Implementing services",
                link:"/guide/dubboForNode/ImplementingServices"
              },
              {
                text:"Server plugins",
                link:"/guide/dubboForNode/ServerPlugins"
              },
              {
                text:"Interceptors",
                link:"/guide/dubboForNode/Interceptors"
              },
              {
                text:"Using clients",
                link:"/guide/dubboForNode/UsingClients"
              },
              {
                text:"Get Requests and Caching",
                link:"/guide/dubboForNode/GetRequestsAndCaching"
              },
              {
                text:"Testing",
                link:"/guide/dubboForNode/Testing"
              }
            ]
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

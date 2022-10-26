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

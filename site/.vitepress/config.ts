import { defineConfig } from 'vitepress'

export default defineConfig({
  appearance: 'dark',
  title: 'Sutto',
  description: 'A GNOME Shell extension for window snapping',
  base: '/sutto/',

  vite: {
    define: {
      __STORE_URL__: JSON.stringify(requireEnv('STORE_URL')),
    },
  },

  rewrites: {
    'en/:path*': ':path*',
  },

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Usage', link: '/usage' },
      { text: 'Installation', link: '/installation' },
      { text: 'Pricing', link: '/pricing' },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Installation', link: '/installation' },
          { text: 'Usage', link: '/usage' },
        ],
      },
      {
        text: 'Licensing',
        items: [
          { text: 'Pricing', link: '/pricing' },
          { text: 'License Activation', link: '/license-activation' },
        ],
      },
      {
        text: 'Support',
        items: [
          { text: 'FAQ', link: '/faq' },
          { text: 'Privacy & Terms', link: '/privacy-terms' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/x7c1/sutto' },
    ],
  },
})

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

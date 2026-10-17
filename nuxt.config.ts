// https://nuxt.com/docs/api/configuration/nuxt-config

// Vite's dev server needs inline eval and a websocket, so the strict policy is for built output only
const hardened = process.env.NODE_ENV !== 'development'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/fonts', 'vuetify-nuxt-module', '@nuxtjs/i18n'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css', '~/assets/css/transitions.css'],
  fonts: {
    // Self-hosted: fetched once at build time and served from our own origin
    provider: 'fontsource',
    families: [
      { name: 'Rubik', provider: 'fontsource', weights: [500, 600, 700], styles: ['normal'], subsets: ['latin'] },
      { name: 'Inter', provider: 'fontsource', weights: [400, 500, 600], styles: ['normal'], subsets: ['latin'] }
    ]
  },
  runtimeConfig: {
    public: {
      // Set NUXT_PUBLIC_UMAMI_WEBSITE_ID to enable Umami; empty keeps dev and tests clean
      umamiWebsiteId: ''
    }
  },
  app: {
    head: {
      // Display-only site: kept out of search indexes (the X-Robots-Tag header says the same)
      meta: [{ name: 'robots', content: 'noindex, nofollow' }]
    }
  },
  routeRules: {
    '/**': {
      headers: {
        'X-Robots-Tag': 'noindex, nofollow',
        ...(hardened && {
          // Inline styles come from Vuetify and inline scripts from the Nuxt payload; posters come from the TMDB CDN
          'Content-Security-Policy': [
            'default-src \'self\'',
            'script-src \'self\' \'unsafe-inline\' https://cloud.umami.is',
            'style-src \'self\' \'unsafe-inline\'',
            'img-src \'self\' data: blob: https://image.tmdb.org',
            'font-src \'self\' data:',
            'connect-src \'self\' https://cloud.umami.is https://api-gateway.umami.dev',
            'object-src \'none\'',
            'base-uri \'self\'',
            'form-action \'self\'',
            'frame-ancestors \'none\''
          ].join('; '),
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'X-Frame-Options': 'DENY',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
        })
      }
    }
  },
  experimental: {
    // Falls back to plain navigation without the API or under prefers-reduced-motion
    viewTransition: true
  },
  vuetify: {
    moduleOptions: {
      // Nuxt ships a built-in useLayout; prefix only the colliding Vuetify one (-> useVLayout)
      prefixComposables: ['useLayout']
    },
    // Theme and component defaults live in vuetify.config.ts
    vuetifyOptions: './vuetify.config.ts'
  },
  i18n: {
    defaultLocale: 'en',
    locales: [{ code: 'en', language: 'en-US', name: 'English', file: 'en.json' }]
  }
})

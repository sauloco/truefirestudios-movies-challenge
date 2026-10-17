// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/fonts', 'vuetify-nuxt-module', '@nuxtjs/i18n'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  fonts: {
    // Self-hosted: fetched once at build time and served from our own origin
    provider: 'fontsource',
    families: [
      { name: 'Rubik', provider: 'fontsource', weights: [500, 600, 700], styles: ['normal'], subsets: ['latin'] },
      { name: 'Inter', provider: 'fontsource', weights: [400, 500, 600], styles: ['normal'], subsets: ['latin'] }
    ]
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

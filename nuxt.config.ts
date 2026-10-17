// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', 'vuetify-nuxt-module', '@nuxtjs/i18n'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  vuetify: {
    moduleOptions: {
      // Nuxt ships a built-in useLayout; prefix only the colliding Vuetify one (-> useVLayout)
      prefixComposables: ['useLayout']
    }
  },
  i18n: {
    defaultLocale: 'en',
    locales: [{ code: 'en', language: 'en-US', name: 'English' }]
  }
})

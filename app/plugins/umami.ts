// Cookieless analytics, loaded only when a website id is configured (NUXT_PUBLIC_UMAMI_WEBSITE_ID).
// A plugin rather than `app.head` so the id is read at runtime and the error page is covered too.
export default defineNuxtPlugin(() => {
  const { umamiWebsiteId } = useRuntimeConfig().public
  if (!umamiWebsiteId) return

  useHead({
    script: [{
      src: 'https://cloud.umami.is/script.js',
      defer: true,
      'data-website-id': umamiWebsiteId,
      // Page views stay per page; the query string only carries legacy share links
      'data-exclude-search': 'true'
    }]
  })
})

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
      // Picks live in ?liked=, which changes on every click; page views stay per page, not per pick
      'data-exclude-search': 'true'
    }]
  })
})

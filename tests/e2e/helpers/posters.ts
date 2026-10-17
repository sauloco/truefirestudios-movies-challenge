import type { Page, Route } from 'playwright-core'

// 1x1 PNG, served for every poster so the specs never reach the real TMDB image CDN
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

export const POSTER_CDN = 'https://image.tmdb.org/**'

export function fulfillPoster(route: Route) {
  return route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL })
}

export function failPoster(route: Route) {
  return route.abort('failed')
}

// Holds every poster request until `release()` so the placeholder state can be observed
export async function holdPosters(page: Page) {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(POSTER_CDN, async (route) => {
    await gate
    await fulfillPoster(route)
  })
  return { release }
}

export async function stubPosters(page: Page, handler: (route: Route) => Promise<void> = fulfillPoster) {
  await page.route(POSTER_CDN, handler)
}

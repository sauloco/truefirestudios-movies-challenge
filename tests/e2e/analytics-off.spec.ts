import { describe, expect, it } from 'vitest'
import { $fetch, createPage, setup, url } from '@nuxt/test-utils/e2e'
import { stubPosters } from './helpers/posters'
import { watchUmamiRequests } from './helpers/umami'

// Pinned empty so a local .env with a real id cannot leak into the run
await setup({
  browser: true,
  nuxtConfig: { runtimeConfig: { public: { umamiWebsiteId: '' } } },
  env: { NUXT_PUBLIC_UMAMI_WEBSITE_ID: '' }
})

describe('without a website id', () => {
  it('renders no Umami script tag', async () => {
    const html = await $fetch<string>('/')
    expect(html).not.toContain('cloud.umami.is')
    expect(html).not.toContain('data-website-id')
  })

  it('sends nothing to Umami while browsing, picking and opening a movie', async () => {
    const page = await createPage()
    await stubPosters(page)
    const requests = await watchUmamiRequests(page)
    await page.goto(url('/'))
    await page.locator('[data-testid="movie-card"]').first().click()
    await page.locator('[data-testid="movie-detail"]').waitFor()
    expect(requests).toEqual([])
    expect(await page.evaluate(() => (window as unknown as { umami?: unknown }).umami)).toBeUndefined()
    await page.close()
  })
})

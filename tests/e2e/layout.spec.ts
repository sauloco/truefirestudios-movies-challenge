import { describe, expect, it } from 'vitest'
import { createPage, setup, url } from '@nuxt/test-utils/e2e'

describe('app shell and footer', async () => {
  await setup({ browser: true })

  it('renders the shell with the product name from the en locale', async () => {
    const page = await createPage('/')
    await page.waitForSelector('[data-testid="app-shell"]')
    expect(await page.locator('[data-testid="movie-search"] label').first().innerText()).toBe('My Movie Room')
    await page.close()
  })

  it('credits TMDB in the footer with a linked logo and the required notice', async () => {
    const page = await createPage('/')
    const footer = page.locator('[data-testid="app-footer"]')
    await footer.waitFor()

    const logo = footer.locator('[data-testid="tmdb-logo"]')
    expect(await logo.getAttribute('alt')).toBe('The Movie Database (TMDB)')
    expect(await logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
    expect(await footer.locator('[data-testid="tmdb-link"]').getAttribute('href')).toBe('https://www.themoviedb.org/')
    expect(await footer.locator('[data-testid="tmdb-notice"]').innerText())
      .toBe('This product uses the TMDB API but is not endorsed or certified by TMDB.')
    await page.close()
  })

  it('shows the whole footer at 360px without horizontal scroll', async () => {
    const page = await createPage()
    await page.setViewportSize({ width: 360, height: 640 })
    await page.goto(url('/'))
    const footer = page.locator('[data-testid="app-footer"]')
    await footer.waitFor()

    const box = (await footer.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(360)
    for (const testid of ['tmdb-logo', 'tmdb-notice']) {
      const part = (await footer.locator(`[data-testid="${testid}"]`).boundingBox())!
      expect(part.x).toBeGreaterThanOrEqual(0)
      expect(part.x + part.width).toBeLessThanOrEqual(360)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
    await page.close()
  })
})

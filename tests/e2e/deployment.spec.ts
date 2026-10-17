import { describe, expect, it } from 'vitest'
import { createPage, fetch, setup, url } from '@nuxt/test-utils/e2e'
import { stubPosters } from './helpers/posters'

// The production build is what Netlify serves, so headers are asserted on it
await setup({ browser: true, nuxtConfig: { runtimeConfig: { public: { umamiWebsiteId: '' } } }, env: { NUXT_PUBLIC_UMAMI_WEBSITE_ID: '' } })

describe('noindex', () => {
  it.each(['/', '/movies/1', '/no-such-page'])('%s carries the meta tag and the header', async (path) => {
    const response = await fetch(path, { headers: { accept: 'text/html' } })
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    expect(await response.text()).toMatch(/<meta[^>]*name="robots"[^>]*content="noindex, nofollow"/)
  })

  it('does not block crawlers in robots.txt, so they can read the noindex', async () => {
    expect(await (await fetch('/robots.txt')).text()).not.toMatch(/Disallow:\s*\//)
  })
})

describe('security headers', () => {
  it.each(['/', '/movies/1', '/api/movies'])('%s sets them', async (path) => {
    const { headers } = await fetch(path)
    expect(headers.get('x-content-type-options')).toBe('nosniff')
    expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
    expect(headers.get('x-frame-options')).toBe('DENY')
    expect(headers.get('permissions-policy')).toContain('camera=()')
    const csp = headers.get('content-security-policy')!
    expect(csp).toContain('frame-ancestors \'none\'')
    expect(csp).toMatch(/script-src[^;]*https:\/\/cloud\.umami\.is/)
    expect(csp).toMatch(/connect-src[^;]*https:\/\/cloud\.umami\.is/)
    expect(csp).toMatch(/img-src[^;]*https:\/\/image\.tmdb\.org/)
  })

  it('lets the app run without a single CSP violation', async () => {
    const page = await createPage()
    await stubPosters(page)
    const messages: string[] = []
    page.on('console', message => messages.push(message.text()))
    page.on('pageerror', error => messages.push(error.message))
    await page.goto(url('/?liked=1'))
    await page.locator('[data-testid="movie-card"]').first().waitFor()
    await page.locator('[data-testid="movie-card"]').first().click()
    await page.locator('[data-testid="movie-detail"]').waitFor()
    expect(messages.filter(text => /content security policy|refused to/i.test(text))).toEqual([])
    await page.close()
  })
})

describe('404 page', () => {
  it('renders the branded page with a way home for an unknown route', async () => {
    const page = await createPage()
    const response = await page.goto(url('/no-such-page'))
    expect(response!.status()).toBe(404)
    expect(await page.locator('[data-testid="error-code"]').innerText()).toBe('404')
    expect(await page.locator('[data-testid="error-title"]').innerText()).toBe('Page not found')
    expect(await page.locator('[data-testid="app-title"]').innerText()).toBe('Movies RusticIT')

    await stubPosters(page)
    await page.locator('[data-testid="error-home"]').click()
    await page.waitForURL(url('/'))
    await page.locator('[data-testid="recommendations"]').waitFor()
    await page.close()
  })

  it('renders it for an unknown movie id too', async () => {
    const page = await createPage()
    const response = await page.goto(url('/movies/999999'))
    expect(response!.status()).toBe(404)
    await page.locator('[data-testid="error-page"]').waitFor()
    await page.close()
  })
})

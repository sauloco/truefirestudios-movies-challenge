import { describe, expect, it } from 'vitest'
import { $fetch, createPage, setup, url } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import type { Profile } from '../../shared/types'
import { stubPosters } from './helpers/posters'

await setup({ browser: true })

async function open(path = '/?user=sam') {
  const page = await createPage()
  await stubPosters(page)
  // The easter-egg wall frames the real site; the specs never reach it
  await page.route('https://rusticit.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>stub</p>' }))
  await page.goto(url(path))
  await page.locator('[data-testid="movie-card"]').first().waitFor()
  await page.waitForFunction(() => (window as unknown as { useNuxtApp?: () => { isHydrating: boolean } }).useNuxtApp?.().isHydrating === false)
  return page
}

const side = (page: Page, wall: string) => page.locator(`[data-testid="wall-${wall}"]`).getAttribute('data-side')
const front = (page: Page, wall: string) => page.waitForFunction(
  name => document.querySelector(`[data-testid="wall-${name}"]`)?.getAttribute('data-side') === 'c',
  wall
)

describe('the room', () => {
  it('starts facing the recommendations with the likes and the watchlist at the sides', async () => {
    const page = await open()
    expect(await side(page, 'recs')).toBe('c')
    expect(await side(page, 'likes')).toBe('l')
    expect(await side(page, 'watch')).toBe('r')
    await page.close()
  })

  it('paints the walls with the viewer\'s tint and pattern', async () => {
    const profiles = await $fetch<Profile[]>('/api/profiles')
    const dale = profiles.find(profile => profile.id === 'dale')!
    const page = await open('/?user=dale')
    const stage = page.locator('[data-testid="room"]')
    expect(await stage.getAttribute('class')).toContain('room-stage--brick')
    expect(await stage.evaluate(el => (el as HTMLElement).style.getPropertyValue('--tint'))).toBe(dale.tint)
    await page.close()
  })

  it('turns the camera with the tabs and the arrow keys', async () => {
    const page = await open()
    await page.locator('[data-testid="wall-tab-watch"]').dispatchEvent('click')
    await front(page, 'watch')
    await page.locator('[data-testid="wall-tab-recs"]').dispatchEvent('click')
    await front(page, 'recs')

    await page.keyboard.press('ArrowLeft')
    await front(page, 'likes')
    await page.close()
  })

  it('closes the ring: past the watchlist is the RusticIT wall, and so is past the likes', async () => {
    const page = await open()
    expect(await page.locator('[data-testid="egg-frame"]').count()).toBe(0)

    await page.keyboard.press('ArrowRight')
    await front(page, 'watch')
    await page.waitForTimeout(500)
    await page.keyboard.press('ArrowRight')
    await front(page, 'egg')
    await page.locator('[data-testid="egg-frame"]').waitFor({ state: 'attached' })
    expect(await page.locator('[data-testid="egg-frame"]').getAttribute('src')).toBe('https://rusticit.com/')

    await page.waitForTimeout(500)
    await page.keyboard.press('ArrowRight')
    await front(page, 'likes')
    await page.close()
  })

  it('keeps walls that are not in front out of the tab order', async () => {
    const page = await open()
    expect(await page.locator('[data-testid="wall-likes"] .room-wall__body').getAttribute('inert')).not.toBeNull()
    expect(await page.locator('[data-testid="wall-recs"] .room-wall__body').getAttribute('inert')).toBeNull()
    await page.close()
  })

  it('has no horizontal scroll at 360px', async () => {
    const page = await createPage()
    await stubPosters(page)
    await page.setViewportSize({ width: 360, height: 640 })
    await page.goto(url('/?user=sam&liked=1,2,3'))
    await page.locator('[data-testid="movie-card"]').first().waitFor()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
    await page.close()
  })
})

describe('the watchlist', () => {
  it('starts empty and says how to fill it', async () => {
    const page = await open()
    await page.locator('[data-testid="wall-tab-watch"]').dispatchEvent('click')
    await front(page, 'watch')
    await page.locator('[data-testid="watchlist-empty"]').waitFor()
    await page.close()
  })

  it('collects bookmarked movies on the right wall and remembers them after a reload', async () => {
    const page = await open()
    const card = page.locator('[data-testid="movie-card"]').first()
    const id = await card.getAttribute('data-movie-id')
    await card.locator('[data-testid="watchlist-toggle"]').click()
    expect(await card.locator('[data-testid="watchlist-toggle"]').getAttribute('aria-pressed')).toBe('true')

    await page.reload()
    await page.locator('[data-testid="movie-card"]').first().waitFor()
    await page.locator('[data-testid="wall-tab-watch"]').dispatchEvent('click')
    await front(page, 'watch')
    const items = page.locator('[data-testid="watchlist-item"]')
    await items.first().waitFor()
    expect(await items.count()).toBe(1)
    expect(await items.first().getAttribute('data-movie-id')).toBe(id)

    await items.first().locator('[data-testid="watchlist-toggle"]').click()
    await page.locator('[data-testid="watchlist-empty"]').waitFor()
    await page.close()
  })

  it('keeps one list per viewer', async () => {
    const page = await open('/?user=sam')
    await page.locator('[data-testid="movie-card"]').first().locator('[data-testid="watchlist-toggle"]').click()
    await page.goto(url('/?user=yuki'))
    await page.locator('[data-testid="movie-card"]').first().waitFor()
    await page.locator('[data-testid="wall-tab-watch"]').dispatchEvent('click')
    await front(page, 'watch')
    await page.locator('[data-testid="watchlist-empty"]').waitFor()
    await page.close()
  })

  it('can be changed from the movie page', async () => {
    const page = await open()
    await page.locator('[data-testid="movie-card"]').first().click()
    await page.locator('[data-testid="movie-detail"]').waitFor()
    const button = page.locator('[data-testid="detail-watchlist"]')
    expect(await button.getAttribute('aria-pressed')).toBe('false')
    await button.click()
    expect(await button.getAttribute('aria-pressed')).toBe('true')
    expect(await button.innerText()).toBe('On my watchlist')
    await page.close()
  })
})

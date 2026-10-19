import { beforeAll, describe, expect, it } from 'vitest'
import { $fetch, createPage, setup } from '@nuxt/test-utils/e2e'
import { gotoAs, waitForViewer } from './helpers/viewer'
import type { Page } from 'playwright-core'
import type { Profile } from '../../shared/types'
import { stubPosters } from './helpers/posters'
import { faceWall } from './helpers/room'

await setup({ browser: true })

let profiles: Profile[]
const profile = (id: string) => profiles.find(candidate => candidate.id === id)!

beforeAll(async () => {
  profiles = await $fetch<Profile[]>('/api/profiles')
})

async function open(path = '/') {
  const page = await createPage()
  await stubPosters(page)
  await visit(page, path)
  return page
}

async function visit(page: Page, path: string) {
  await gotoAs(page, path)
  await page.locator('[data-testid="user-switcher"]').waitFor()
  await page.waitForFunction(() => (window as unknown as { useNuxtApp?: () => { isHydrating: boolean } }).useNuxtApp?.().isHydrating === false)
}

const chips = (page: Page) => page.locator('[data-testid="liked-chip"]')
const radio = (page: Page, id: string) => page.locator(`[data-testid="user-${id}"]`)
const titles = (page: Page) => page.locator('[data-testid="movie-card-title"]').allInnerTexts()

async function waitForChips(page: Page, count: number) {
  await page.waitForFunction(expected => document.querySelectorAll('[data-testid="liked-chip"]').length === expected, count)
}

const likedParam = (id: string) => profile(id).liked.join(',')

describe('user switcher', () => {
  it('lands a bare visit on the first viewer with their own likes and a clean URL', async () => {
    const page = await open('/')
    expect(new URL(page.url()).search).toBe('')
    expect(await chips(page).count()).toBe(profile('sam').liked.length)
    expect(await radio(page, 'sam').getAttribute('aria-checked')).toBe('true')
    await page.close()
  })

  it('renders as a radiogroup with one radio per profile and a roving tabindex', async () => {
    const page = await open('/')
    const group = page.getByRole('radiogroup', { name: 'Switch viewer' })
    const radios = group.getByRole('radio')
    expect(await radios.count()).toBe(4)
    expect(await radios.evaluateAll(items => items.map(item => item.getAttribute('aria-label')))).toEqual(profiles.map(item => item.name))
    expect(await radios.evaluateAll(items => items.map(item => item.getAttribute('tabindex')))).toEqual(['0', '-1', '-1', '-1'])
    await page.close()
  })

  it('swaps the chips and the recommendations when another avatar is clicked', async () => {
    const page = await open('/?user=sam')
    await page.locator('[data-testid="movie-card"]').first().waitFor()
    const before = await titles(page)

    await radio(page, 'dale').click()
    await waitForViewer(page, 'dale', profile('dale').liked)
    await waitForChips(page, profile('dale').liked.length)
    expect(await radio(page, 'dale').getAttribute('aria-checked')).toBe('true')
    expect(await radio(page, 'sam').getAttribute('aria-checked')).toBe('false')
    await page.waitForFunction(previous => document.querySelector('[data-testid="movie-card-title"]')?.textContent !== previous, before[0])
    expect(await titles(page)).not.toEqual(before)
    expect(await page.locator('[data-testid="active-profile-name"]').innerText()).toBe('Dale Whitfield')
    await page.close()
  })

  it('goes back to the previous viewer and their picks', async () => {
    const page = await open('/?user=sam')
    await radio(page, 'lucia').click()
    await waitForChips(page, profile('lucia').liked.length)

    await page.goBack()
    await waitForViewer(page, 'sam', [])
    await waitForChips(page, 0)
    expect(await radio(page, 'sam').getAttribute('aria-checked')).toBe('true')
    await page.close()
  })

  it('moves between viewers with the arrow keys, wrapping at the ends', async () => {
    const page = await open('/?user=sam')
    await radio(page, 'sam').focus()

    await page.keyboard.press('ArrowRight')
    await waitForViewer(page, 'yuki')
    expect(await radio(page, 'yuki').getAttribute('aria-checked')).toBe('true')
    expect(await radio(page, 'yuki').getAttribute('tabindex')).toBe('0')
    expect(await radio(page, 'sam').getAttribute('tabindex')).toBe('-1')
    await page.waitForFunction(() => document.activeElement?.getAttribute('data-testid') === 'user-yuki')

    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await waitForViewer(page, 'dale')
    await page.waitForFunction(() => document.activeElement?.getAttribute('data-testid') === 'user-dale')
    await page.close()
  })

  it('restores the last viewer from localStorage on a bare visit', async () => {
    const page = await open('/?user=lucia')
    await visit(page, '/')
    await waitForViewer(page, 'lucia')
    expect(await radio(page, 'lucia').getAttribute('aria-checked')).toBe('true')
    await page.close()
  })

  it('falls back to the first viewer for an unknown ?user=', async () => {
    const page = await open('/?user=nobody')
    await waitForViewer(page, 'sam')
    expect(await radio(page, 'sam').getAttribute('aria-checked')).toBe('true')
    await page.close()
  })

  it('imports an old ?liked= link into storage and cleans the URL', async () => {
    const page = await open('/?liked=1,2')
    await waitForViewer(page, 'sam', [1, 2])
    await page.waitForURL(url => url.search === '')
    expect(await chips(page).count()).toBe(2)
    await page.close()
  })

  it('does not reseed the viewer\'s likes after the last chip is removed', async () => {
    const page = await open('/?user=sam&liked=5')
    await faceWall(page, 'likes')
    await page.getByRole('button', { name: /^Remove / }).click()
    await waitForChips(page, 0)
    await waitForViewer(page, 'sam', [])
    await page.waitForTimeout(400)
    expect(await chips(page).count()).toBe(0)
    expect(await page.locator('[data-testid="recommendations-heading"]').innerText()).toBe('Recommendations Wall')
    await page.close()
  })

  it('keeps the viewer and picks on the detail page and its Back link', async () => {
    const page = await open('/?user=yuki&liked=' + likedParam('yuki'))
    await page.locator('[data-testid="movie-card"]').first().click()
    await page.locator('[data-testid="movie-detail"]').waitFor()
    const back = page.locator('[data-testid="detail-back"]')
    expect(await back.getAttribute('href')).toBe('/')

    await back.click()
    await waitForViewer(page, 'yuki', profile('yuki').liked)
    await waitForChips(page, profile('yuki').liked.length)
    await page.close()
  })

  it('fits the narrow viewport without horizontal scroll and hides the name', async () => {
    const page = await createPage()
    await stubPosters(page)
    await page.setViewportSize({ width: 360, height: 640 })
    await gotoAs(page, '/?user=dale')
    await page.locator('[data-testid="user-switcher"]').waitFor()
    expect(await page.locator('[data-testid="active-profile-name"]').isVisible()).toBe(false)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
    const header = (await page.locator('[data-testid="app-header"]').boundingBox())!
    const switcher = (await page.locator('[data-testid="user-switcher"]').boundingBox())!
    expect(switcher.x).toBeGreaterThanOrEqual(0)
    expect(switcher.x + switcher.width).toBeLessThanOrEqual(header.x + header.width)
    await page.close()
  })

  it('does not animate the avatars under reduced motion', async () => {
    const page = await createPage()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await gotoAs(page, '/?user=sam')
    await page.locator('[data-testid="user-switcher"]').waitFor()
    expect(await radio(page, 'sam').evaluate(item => getComputedStyle(item).transitionDuration)).toBe('0s')
    await page.close()
  })
})

import { beforeAll, describe, expect, it } from 'vitest'
import { $fetch, createPage, setup, url } from '@nuxt/test-utils/e2e'
import type { Movie, Profile } from '../../shared/types'
import { stubPosters } from './helpers/posters'

await setup({ browser: true })

let profiles: Profile[]
let movies: Movie[]

beforeAll(async () => {
  [profiles, movies] = await Promise.all([$fetch<Profile[]>('/api/profiles'), $fetch<Movie[]>('/api/movies')])
})

describe('switching viewer starts from a clean context', () => {
  it('drops the search text, the open menu, the previous edits and the previous results', async () => {
    const sam = profiles.find(profile => profile.id === 'sam')!
    const dale = profiles.find(profile => profile.id === 'dale')!
    const errors: string[] = []

    const page = await createPage()
    page.on('console', message => message.type() === 'error' && errors.push(message.text()))
    page.on('pageerror', error => errors.push(error.message))
    await stubPosters(page)
    await page.goto(url('/?user=sam&liked=' + sam.liked.join(',')))
    await page.waitForFunction(() => (window as unknown as { useNuxtApp?: () => { isHydrating: boolean } }).useNuxtApp?.().isHydrating === false)
    await page.locator('[data-testid="movie-card"]').first().waitFor()
    const samCards = await page.locator('[data-testid="movie-card-title"]').allInnerTexts()

    // As Sam: remove a chip, then type into the search and leave its menu open
    const removed = movies.find(movie => movie.id === sam.liked[0])!
    await page.getByRole('button', { name: `Remove ${removed.title}` }).click()
    await page.waitForFunction(count => document.querySelectorAll('[data-testid="liked-chip"]').length === count, sam.liked.length - 1)
    const input = page.locator('[data-testid="movie-search"] input')
    await input.click()
    await input.fill('star')
    await page.locator('[role="option"]').first().waitFor()

    await page.locator('[data-testid="user-dale"]').click()
    await page.waitForURL(`**/?user=dale&liked=${dale.liked.join(',')}`)
    await page.waitForFunction(count => document.querySelectorAll('[data-testid="liked-chip"]').length === count, dale.liked.length)

    expect(await input.inputValue()).toBe('')
    expect(await page.locator('[role="option"]').count()).toBe(0)
    expect(await page.locator('[data-testid="movie-search"] [aria-expanded="true"]').count()).toBe(0)
    expect(new Set(await page.locator('[data-testid="liked-chip"]').allInnerTexts()).has(`${removed.title} (${removed.year})`)).toBe(dale.liked.includes(removed.id))
    expect(await page.locator('[data-testid="reset-likes"]').count()).toBe(0)

    // Never Sam's results under Dale's picks: once settled, the cards are exactly what the API returns for Dale
    await page.locator('[data-testid="movie-card"]').first().waitFor()
    const expected = await $fetch<{ items: { movie: Movie }[] }>('/api/recommendations', { method: 'POST', body: { liked: dale.liked, limit: 12 } })
    await page.waitForFunction(count => document.querySelectorAll('[data-testid="movie-card"]').length === count, expected.items.length)
    expect(await page.locator('[data-testid="movie-card-title"]').allInnerTexts()).toEqual(expected.items.map(item => item.movie.title))
    expect(await page.locator('[data-testid="movie-card-title"]').allInnerTexts()).not.toEqual(samCards)

    expect(errors).toEqual([])
    await page.close()
  })

  it('clears a failed recommendation request and the ignored-ids notice', async () => {
    const dale = profiles.find(profile => profile.id === 'dale')!
    const page = await createPage()
    await stubPosters(page)
    await page.route('**/api/recommendations', route => route.abort('failed'))
    await page.goto(url('/?user=sam&liked=5,abc'))
    await page.locator('[data-testid="ignored-ids-notice"]').waitFor()
    await page.waitForFunction(() => (window as unknown as { useNuxtApp?: () => { isHydrating: boolean } }).useNuxtApp?.().isHydrating === false)

    await page.unroute('**/api/recommendations')
    await page.locator('[data-testid="user-dale"]').click()
    await page.waitForURL(`**/?user=dale&liked=${dale.liked.join(',')}`)
    await page.locator('[data-testid="movie-card"]').first().waitFor()
    expect(await page.locator('[data-testid="ignored-ids-notice"]').count()).toBe(0)
    expect(await page.locator('[data-testid="recommendation-error"]').count()).toBe(0)
    await page.close()
  })

  it('scrolls back to the top', async () => {
    const page = await createPage()
    await stubPosters(page)
    await page.goto(url('/?user=sam&liked=5'))
    await page.locator('[data-testid="movie-card"]').first().waitFor()
    await page.waitForFunction(() => (window as unknown as { useNuxtApp?: () => { isHydrating: boolean } }).useNuxtApp?.().isHydrating === false)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

    await page.locator('[data-testid="user-yuki"]').click()
    await page.waitForURL(url => url.searchParams.get('user') === 'yuki')
    await page.waitForFunction(() => window.scrollY === 0)
    await page.close()
  })
})

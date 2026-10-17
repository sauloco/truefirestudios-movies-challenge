import { beforeAll, describe, expect, it } from 'vitest'
import { $fetch, createPage, setup, url } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import type { Movie } from '../../shared/types'
import { stubPosters } from './helpers/posters'
import { UMAMI_SCRIPT, stubUmami, watchUmamiRequests } from './helpers/umami'

const WEBSITE_ID = '00000000-0000-4000-8000-000000000000'

await setup({
  browser: true,
  nuxtConfig: { runtimeConfig: { public: { umamiWebsiteId: WEBSITE_ID } } },
  env: { NUXT_PUBLIC_UMAMI_WEBSITE_ID: WEBSITE_ID }
})

let STAR_WARS: Movie
let EMPIRE: Movie

beforeAll(async () => {
  const movies = await $fetch<Movie[]>('/api/movies')
  STAR_WARS = movies.find(movie => movie.title === 'Star Wars')!
  EMPIRE = movies.find(movie => /Empire Strikes Back/.test(movie.title))!
})

async function open(path = '/?user=sam') {
  const page = await createPage()
  await stubPosters(page)
  const umami = await stubUmami(page)
  await page.goto(url(path))
  await page.locator('[data-testid="movie-search"]').waitFor()
  await page.waitForFunction(() => (window as unknown as { useNuxtApp?: () => { isHydrating: boolean } }).useNuxtApp?.().isHydrating === false)
  return { page, umami }
}

async function pick(page: Page, movie: Movie) {
  const input = page.locator('[data-testid="movie-search"] input')
  await input.click()
  await input.fill(movie.title)
  await page.locator(`[data-testid="movie-option-${movie.id}"]`).click()
}

describe('Umami script', () => {
  it('is loaded deferred with the website id and without the query string', async () => {
    const html = await $fetch<string>('/')
    const tag = html.match(/<script[^>]*src="https:\/\/cloud\.umami\.is\/script\.js"[^>]*>/)?.[0]
    expect(tag).toBeDefined()
    expect(tag).toContain('defer')
    expect(tag).toContain(`data-website-id="${WEBSITE_ID}"`)
    expect(tag).toContain('data-exclude-search="true"')
  })

  it('is requested by the browser', async () => {
    const page = await createPage()
    await stubPosters(page)
    await stubUmami(page)
    const scriptRequest = page.waitForRequest(UMAMI_SCRIPT)
    await page.goto(url('/'))
    await scriptRequest
    await page.close()
  })
})

describe('custom events', () => {
  it('fires recommendations-shown for the popular list on load', async () => {
    const { page, umami } = await open()
    await page.locator('[data-testid="movie-card"]').first().waitFor()
    expect(await umami.events()).toEqual([
      { event: 'recommendations-shown', data: { pickCount: 0, source: 'popular' } }
    ])
    await page.close()
  })

  it('fires movie-picked then recommendations-shown when a movie is picked', async () => {
    const { page, umami } = await open()
    await pick(page, STAR_WARS)
    await page.getByRole('heading', { name: 'Recommended for you' }).waitFor()
    expect(await umami.events()).toEqual([
      { event: 'recommendations-shown', data: { pickCount: 0, source: 'popular' } },
      { event: 'movie-picked', data: { movieId: STAR_WARS.id, pickCount: 1 } },
      { event: 'recommendations-shown', data: { pickCount: 1, source: 'personalized' } }
    ])
    await page.close()
  })

  it('fires movie-removed with the remaining pick count', async () => {
    const { page, umami } = await open(`/?user=sam&liked=${STAR_WARS.id},${EMPIRE.id}`)
    await page.locator('[data-testid="movie-card"]').first().waitFor()
    await page.getByRole('button', { name: `Remove ${STAR_WARS.title}` }).click()
    await page.waitForURL(`**/?user=sam&liked=${EMPIRE.id}`)
    expect(await umami.events()).toContainEqual({ event: 'movie-removed', data: { movieId: STAR_WARS.id, pickCount: 1 } })
    await page.close()
  })

  it('fires recommendations-shown for a deep link rendered on the server', async () => {
    const { page, umami } = await open(`/?user=sam&liked=${STAR_WARS.id},${EMPIRE.id}`)
    await page.locator('[data-testid="movie-card"]').first().waitFor()
    expect(await umami.events()).toEqual([
      { event: 'recommendations-shown', data: { pickCount: 2, source: 'personalized' } }
    ])
    await page.close()
  })

  it('fires recommendation-clicked with the movie id and source', async () => {
    const { page, umami } = await open(`/?user=sam&liked=${STAR_WARS.id}`)
    const card = page.locator('[data-testid="movie-card"]').first()
    await card.waitFor()
    const movieId = Number(await card.getAttribute('data-movie-id'))
    await card.click()
    await page.waitForURL(`**/movies/${movieId}**`)
    expect(await umami.events()).toContainEqual({ event: 'recommendation-clicked', data: { movieId, source: 'personalized' } })
    await page.close()
  })

  it('never sends anything to an Umami host itself', async () => {
    const { page, umami } = await open()
    await pick(page, STAR_WARS)
    await page.getByRole('heading', { name: 'Recommended for you' }).waitFor()
    expect(umami.stray).toEqual([])
    await page.close()
  })

  it('carries ids and counts only', async () => {
    const { page, umami } = await open()
    await pick(page, STAR_WARS)
    await page.getByRole('heading', { name: 'Recommended for you' }).waitFor()
    for (const { data } of await umami.events()) {
      for (const [key, value] of Object.entries(data ?? {})) {
        expect(['movieId', 'pickCount', 'source']).toContain(key)
        expect(typeof value === 'number' || value === 'popular' || value === 'personalized').toBe(true)
      }
    }
    await page.close()
  })
})

describe('blocked script', () => {
  it('does not break picking, results or navigation', async () => {
    const page = await createPage()
    await stubPosters(page)
    const requests = await watchUmamiRequests(page)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(url('/'))
    await page.locator('[data-testid="movie-search"]').waitFor()
    await page.waitForFunction(() => (window as unknown as { useNuxtApp?: () => { isHydrating: boolean } }).useNuxtApp?.().isHydrating === false)

    await pick(page, STAR_WARS)
    await page.getByRole('heading', { name: 'Recommended for you' }).waitFor()
    await page.locator('[data-testid="movie-card"]').first().click()
    await page.locator('[data-testid="movie-detail"]').waitFor()

    expect(requests).toContain(UMAMI_SCRIPT)
    expect(await page.evaluate(() => (window as unknown as { umami?: unknown }).umami)).toBeUndefined()
    expect(errors).toEqual([])
    await page.close()
  })
})

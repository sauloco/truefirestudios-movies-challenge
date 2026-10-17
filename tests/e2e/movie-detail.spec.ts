import { beforeAll, describe, expect, it } from 'vitest'
import { $fetch, createPage, fetch, setup, url } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import type { Movie } from '../../shared/types'
import { stubPosters } from './helpers/posters'

await setup({ browser: true })

let movies: Movie[]
let STAR_WARS: Movie
let EMPIRE: Movie

beforeAll(async () => {
  movies = await $fetch<Movie[]>('/api/movies')
  STAR_WARS = movies.find(movie => movie.title === 'Star Wars')!
  EMPIRE = movies.find(movie => /Empire Strikes Back/.test(movie.title))!
})

// Records every startViewTransition call with the transition names on the page before and after the update
const SPY = () => {
  const names = () => [...document.querySelectorAll('*')]
    .map(element => getComputedStyle(element).viewTransitionName)
    .filter(name => name !== 'none')
  const calls: { before: string[], after: string[] }[] = []
  ;(window as unknown as { __transitions: typeof calls }).__transitions = calls
  const original = document.startViewTransition.bind(document)
  document.startViewTransition = ((callback?: () => unknown) => {
    const call = { before: names(), after: [] as string[] }
    calls.push(call)
    return original(async () => {
      await callback?.()
      call.after = names()
    })
  }) as typeof document.startViewTransition
}

async function open(path = '/?user=sam', options: { reducedMotion?: boolean } = {}) {
  const page = await createPage()
  if (options.reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' })
  await stubPosters(page)
  await page.addInitScript(SPY)
  await page.goto(url(path))
  await hydrated(page)
  return page
}

const hydrated = (page: Page) =>
  page.waitForFunction(() => (window as unknown as { useNuxtApp?: () => { isHydrating: boolean } }).useNuxtApp?.().isHydrating === false)

const transitions = (page: Page) =>
  page.evaluate(() => (window as unknown as { __transitions: { before: string[], after: string[] }[] }).__transitions)

const card = (page: Page, movie: Movie) => page.locator(`[data-testid="movie-card"][data-movie-id="${movie.id}"]`)

async function firstPopularCard(page: Page) {
  await page.locator('[data-testid="movie-card"]').first().waitFor()
  const id = await page.locator('[data-testid="movie-card"]').first().getAttribute('data-movie-id')
  return movies.find(movie => movie.id === Number(id))!
}

describe('movie detail page', () => {
  it('opens the movie behind the clicked card', async () => {
    const page = await open()
    const target = await firstPopularCard(page)
    await card(page, target).click()

    await page.waitForURL(`**/movies/${target.id}?user=sam`)
    await page.locator('[data-testid="movie-detail"]').waitFor()
    expect(await page.locator('[data-testid="detail-title"]').innerText()).toBe(target.title)
    expect(await page.locator('[data-testid="detail-year"]').innerText()).toBe(String(target.year))
    expect(await page.locator('[data-testid="detail-overview"]').innerText()).toBe(target.overview)
    await page.close()
  })

  it('starts a view transition carrying the same poster and title names at both ends', async () => {
    const page = await open()
    const target = await firstPopularCard(page)
    await card(page, target).click()
    await page.locator('[data-testid="movie-detail"]').waitFor()

    const [call] = await transitions(page)
    for (const name of [`movie-poster-${target.id}`, `movie-title-${target.id}`]) {
      expect(call.before).toContain(name)
      expect(call.after).toContain(name)
    }
    await page.close()
  })

  it('keeps ?liked= on the card links and restores the grid and query on Back', async () => {
    const page = await open(`/?user=sam&liked=${STAR_WARS.id}`)
    const target = await firstPopularCard(page)
    expect(await card(page, target).getAttribute('href')).toBe(`/movies/${target.id}?user=sam&liked=${STAR_WARS.id}`)

    await card(page, target).click()
    await page.locator('[data-testid="movie-detail"]').waitFor()
    await page.locator('[data-testid="detail-back"]').click()

    await page.waitForURL(`**/?user=sam&liked=${STAR_WARS.id}`)
    await page.locator('[data-testid="recommendation-grid"]').waitFor()
    expect(await card(page, target).isVisible()).toBe(true)
    expect(await page.locator('[data-testid="liked-chip"]').count()).toBe(1)
    await page.close()
  })

  it('shows the match score after arriving from a card and no like button', async () => {
    const page = await open(`/?user=sam&liked=${STAR_WARS.id}`)
    const target = await firstPopularCard(page)
    const cardScore = await card(page, target).locator('[data-testid="movie-card-score"]').innerText()
    await card(page, target).click()

    await page.locator('[data-testid="detail-score"]').waitFor()
    expect(await page.locator('[data-testid="detail-score"]').innerText()).toBe(cardScore)
    expect(await page.getByRole('button', { name: /like/i }).count()).toBe(0)
    await page.close()
  })

  it('renders on the server for a direct visit, without a score, and Back goes home as the same viewer', async () => {
    const html = await $fetch<string>(`/movies/${EMPIRE.id}`)
    expect(html).toContain('data-testid="movie-detail"')
    expect(html).toContain(EMPIRE.overview.slice(0, 40))
    expect(html).toContain(`view-transition-name:movie-poster-${EMPIRE.id}`)

    const page = await open(`/movies/${EMPIRE.id}?user=sam`)
    expect(await page.locator('[data-testid="detail-score"]').count()).toBe(0)
    const back = page.locator('[data-testid="detail-back"]')
    expect(await back.isVisible()).toBe(true)
    expect(await back.getAttribute('href')).toBe('/?user=sam')
    await back.click()
    await page.waitForURL(url('/?user=sam'))
    await page.locator('[data-testid="recommendation-grid"]').waitFor()
    await page.close()
  })

  it.each(['999999', 'abc', '12abc'])('answers 404 for the id %s', async (id) => {
    const response = await fetch(`/movies/${id}`)
    expect(response.status).toBe(404)
  })

  it('skips the transition under reduced motion', async () => {
    const page = await open('/?user=sam', { reducedMotion: true })
    const target = await firstPopularCard(page)
    await card(page, target).click()

    await page.waitForURL(`**/movies/${target.id}?user=sam`)
    await page.locator('[data-testid="movie-detail"]').waitFor()
    expect(await transitions(page)).toEqual([])
    await page.close()
  })
})

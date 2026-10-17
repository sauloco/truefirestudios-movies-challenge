import { beforeAll, describe, expect, it } from 'vitest'
import { $fetch, createPage, setup, url } from '@nuxt/test-utils/e2e'
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

async function open(path = '/') {
  const page = await createPage()
  await stubPosters(page)
  await page.goto(url(path))
  await page.locator('[data-testid="movie-search"]').waitFor()
  // Typing before hydration would be lost to the server-rendered input
  await page.waitForFunction(() => (window as unknown as { useNuxtApp?: () => { isHydrating: boolean } }).useNuxtApp?.().isHydrating === false)
  return page
}

const chips = (page: Page) => page.locator('[data-testid="liked-chip"]')
const options = (page: Page) => page.locator('[role="option"]')

async function search(page: Page, text: string) {
  const input = page.locator('[data-testid="movie-search"] input')
  await input.click()
  await input.fill(text)
}

describe('MovieSearch and LikedChips', () => {
  it('renders keyboard focus on the field without an inner input outline', async () => {
    const page = await open()
    const input = page.locator('[data-testid="movie-search"] input')
    await input.focus()
    await page.keyboard.type('star wars')
    await options(page).first().waitFor()

    expect(await input.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('none')
    const field = page.locator('[data-testid="movie-search"] .v-field')
    expect(await field.getAttribute('class')).toContain('v-field--focused')
    const outline = field.locator('.v-field__outline')
    expect(await outline.getAttribute('class')).toContain('text-primary')
    expect(await outline.evaluate(el => getComputedStyle(el).getPropertyValue('--v-field-border-width'))).toBe('2px')
    await page.close()
  })

  it('filters the options as you type', async () => {
    const page = await open()
    await search(page, 'star wars')
    await options(page).first().waitFor()
    const titles = await options(page).allInnerTexts()
    expect(titles.length).toBeGreaterThan(0)
    expect(titles.every(title => /star wars/i.test(title))).toBe(true)
    await page.close()
  })

  it('shows a no-data message when nothing matches', async () => {
    const page = await open()
    await search(page, 'zzzzzz')
    await page.getByText('No matching movies').waitFor()
    await page.close()
  })

  it('adds a chip when an option is chosen, clears the field and updates the URL', async () => {
    const page = await open()
    await search(page, 'star wars')
    await page.locator(`[data-testid="movie-option-${STAR_WARS.id}"]`).click()

    await chips(page).first().waitFor()
    expect(await chips(page).allInnerTexts()).toEqual([`${STAR_WARS.title} (${STAR_WARS.year})`])
    expect(await page.locator('[data-testid="movie-search"] input').inputValue()).toBe('')
    await page.waitForURL(`**/?liked=${STAR_WARS.id}`)
    await page.close()
  })

  it('removes a chip with its close button', async () => {
    const page = await open(`/?liked=${STAR_WARS.id},${EMPIRE.id}`)
    expect(await chips(page).count()).toBe(2)

    await page.getByRole('button', { name: `Remove ${STAR_WARS.title}` }).click()
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="liked-chip"]').length === 1)
    expect(await chips(page).allInnerTexts()).toEqual([`${EMPIRE.title} (${EMPIRE.year})`])
    await page.waitForURL(`**/?liked=${EMPIRE.id}`)
    await page.close()
  })

  it('drops the query once the last chip is removed', async () => {
    const page = await open(`/?liked=${STAR_WARS.id}`)
    await page.getByRole('button', { name: `Remove ${STAR_WARS.title}` }).click()
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="liked-chip"]').length === 0)
    await page.waitForURL(url => !url.search)
    await page.close()
  })

  it('does not offer movies that are already picked', async () => {
    const page = await open(`/?liked=${STAR_WARS.id}`)
    await search(page, 'star wars')
    await page.waitForTimeout(300)
    expect(await page.locator(`[data-testid="movie-option-${STAR_WARS.id}"]`).count()).toBe(0)
    await page.close()
  })

  it('can be driven by the keyboard alone', async () => {
    const page = await open()
    const input = page.locator('[data-testid="movie-search"] input')
    await input.focus()
    await page.keyboard.type('star wars')
    await options(page).first().waitFor()
    await page.keyboard.press('Enter')
    await chips(page).first().waitFor()
    expect((await chips(page).first().innerText())).toMatch(/^Star Wars/)

    await page.keyboard.type('empire')
    await options(page).first().waitFor()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="liked-chip"]').length === 2)
    await page.close()
  })
})

describe('page and URL state', () => {
  it('renders deep-linked results in the server HTML, before hydration', async () => {
    const html = await $fetch<string>(`/?liked=${STAR_WARS.id},${EMPIRE.id}`)
    expect(html).toContain('Recommended for you')
    expect(html).toContain('data-testid="movie-card"')
    expect(html).toContain('Because you liked')
    expect(html).toContain(STAR_WARS.title)
  })

  it('shows personalized cards with reasons and match scores for a deep link', async () => {
    const page = await open(`/?liked=${STAR_WARS.id},${EMPIRE.id}`)
    await page.locator('[data-testid="movie-card"]').first().waitFor()
    expect(await page.locator('[data-testid="recommendations-heading"]').innerText()).toBe('Recommended for you')
    expect(await chips(page).count()).toBe(2)

    const first = page.locator('[data-testid="movie-card"]').first()
    expect(await first.locator('[data-testid="movie-card-reason"]').innerText()).toMatch(/^Because you liked .*(Star Wars|Empire)/)
    expect(await first.locator('[data-testid="movie-card-score"]').innerText()).toBe('100% match')
    await page.close()
  })

  it('keeps the picks and results after a refresh', async () => {
    const page = await open(`/?liked=${STAR_WARS.id}`)
    await page.reload()
    await page.locator('[data-testid="movie-card"]').first().waitFor()
    expect(await chips(page).allInnerTexts()).toEqual([`${STAR_WARS.title} (${STAR_WARS.year})`])
    await page.close()
  })

  it('refetches recommendations after picking a movie', async () => {
    const page = await open()
    expect(await page.locator('[data-testid="recommendations-heading"]').innerText()).toBe('Popular right now')
    await search(page, 'star wars')
    await page.locator(`[data-testid="movie-option-${STAR_WARS.id}"]`).click()
    await page.getByRole('heading', { name: 'Recommended for you' }).waitFor()
    expect(await page.locator('[data-testid="movie-card-title"]').allInnerTexts()).not.toContain(STAR_WARS.title)
    await page.close()
  })

  it('ignores invalid and unknown ids in the URL and says so', async () => {
    const page = await open(`/?liked=${STAR_WARS.id},abc,9999,-3,${STAR_WARS.id},`)
    await page.locator('[data-testid="movie-card"]').first().waitFor()
    expect(await chips(page).allInnerTexts()).toEqual([`${STAR_WARS.title} (${STAR_WARS.year})`])
    expect(await page.locator('[data-testid="ignored-ids-notice"]').innerText()).toContain('were not recognised')
    await page.close()
  })

  it('falls back to popular results when no id in the URL is valid', async () => {
    const page = await open('/?liked=abc,9999')
    await page.locator('[data-testid="movie-card"]').first().waitFor()
    expect(await page.locator('[data-testid="recommendations-heading"]').innerText()).toBe('Popular right now')
    expect(await chips(page).count()).toBe(0)
    await page.close()
  })

  it('shows the empty state when every movie is picked', async () => {
    const all = movies.map(movie => movie.id).join(',')
    const page = await open(`/?liked=${all}`)
    await page.locator('[data-testid="recommendation-empty"]').waitFor()
    expect(await page.locator('[data-testid="movie-card"]').count()).toBe(0)
    await page.close()
  })

  it('shows a loading state, then an error with a working retry, when the request fails', async () => {
    const page = await open()
    let attempts = 0
    await page.route('**/api/recommendations', async (route) => {
      attempts++
      if (attempts === 1) return route.abort('failed')
      await new Promise(resolve => setTimeout(resolve, 400))
      return route.continue()
    })

    await search(page, 'star wars')
    await page.locator(`[data-testid="movie-option-${STAR_WARS.id}"]`).click()
    await page.locator('[data-testid="recommendation-error"]').waitFor()
    expect(await page.locator('[data-testid="movie-card"]').count()).toBe(0)

    await page.locator('[data-testid="recommendation-retry"]').click()
    await page.locator('[data-testid="recommendation-skeleton"]').first().waitFor()
    await page.locator('[data-testid="movie-card"]').first().waitFor()
    expect(await page.locator('[data-testid="recommendation-error"]').count()).toBe(0)
    await page.close()
  })

  it('has no horizontal scroll at 360px with picks and results', async () => {
    const page = await createPage()
    await stubPosters(page)
    await page.setViewportSize({ width: 360, height: 640 })
    await page.goto(url(`/?liked=${STAR_WARS.id},${EMPIRE.id}`))
    await page.locator('[data-testid="movie-card"]').first().waitFor()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
    await page.close()
  })
})

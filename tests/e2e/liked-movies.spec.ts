import { beforeAll, describe, expect, it } from 'vitest'
import { $fetch, createPage, setup } from '@nuxt/test-utils/e2e'
import { gotoAs, waitForViewer } from './helpers/viewer'
import type { Page } from 'playwright-core'
import type { Movie } from '../../shared/types'
import { stubPosters } from './helpers/posters'
import { faceWall } from './helpers/room'

await setup({ browser: true })

let movies: Movie[]
let STAR_WARS: Movie
let EMPIRE: Movie

beforeAll(async () => {
  movies = await $fetch<Movie[]>('/api/movies')
  STAR_WARS = movies.find(movie => movie.title === 'Star Wars')!
  EMPIRE = movies.find(movie => /Empire Strikes Back/.test(movie.title))!
})

// `?user=sam` without `liked` means a viewer with no picks
async function open(path = '/?user=sam') {
  const page = await createPage()
  await stubPosters(page)
  await gotoAs(page, path)
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
  it('glows the header like a poster while the field has focus, with no inner input outline', async () => {
    const page = await open()
    const input = page.locator('[data-testid="movie-search"] input')
    const header = page.locator('[data-testid="app-header"]')
    expect(await header.evaluate(el => getComputedStyle(el).boxShadow)).toBe('none')

    await input.focus()
    await page.keyboard.type('star wars')
    await options(page).first().waitFor()

    expect(await input.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('none')
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-testid="app-header"]')!).boxShadow.includes('255, 244, 214'))
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
    await waitForViewer(page, 'sam', [STAR_WARS.id])
    await page.close()
  })

  it('removes a chip with its close button', async () => {
    const page = await open(`/?user=sam&liked=${STAR_WARS.id},${EMPIRE.id}`)
    expect(await chips(page).count()).toBe(2)

    await faceWall(page, 'likes')
    await page.getByRole('button', { name: `Remove ${STAR_WARS.title}` }).click()
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="liked-chip"]').length === 1)
    expect(await chips(page).allInnerTexts()).toEqual([`${EMPIRE.title} (${EMPIRE.year})`])
    await waitForViewer(page, 'sam', [EMPIRE.id])
    await page.close()
  })

  it('drops the query once the last chip is removed', async () => {
    const page = await open(`/?user=sam&liked=${STAR_WARS.id}`)
    await faceWall(page, 'likes')
    await page.getByRole('button', { name: `Remove ${STAR_WARS.title}` }).click()
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="liked-chip"]').length === 0)
    await waitForViewer(page, 'sam', [])
    await page.close()
  })

  it('does not offer movies that are already picked', async () => {
    const page = await open(`/?user=sam&liked=${STAR_WARS.id}`)
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
    const html = await $fetch<string>(`/?user=sam&liked=${STAR_WARS.id},${EMPIRE.id}`)
    expect(html).toContain('Recommendations Wall')
    expect(html).toContain('data-testid="movie-card"')
    expect(html).toContain('Because you liked')
    expect(html).toContain(STAR_WARS.title)
  })

  it('shows personalized cards with reasons and match scores for a deep link', async () => {
    const page = await open(`/?user=sam&liked=${STAR_WARS.id},${EMPIRE.id}`)
    await page.locator('[data-testid="movie-card"]').first().waitFor()
    expect(await page.locator('[data-testid="recommendations-heading"]').innerText()).toBe('Recommendations Wall')
    expect(await chips(page).count()).toBe(2)

    const first = page.locator('[data-testid="movie-card"]').first()
    expect(await first.locator('[data-testid="movie-card-reason"]').innerText()).toMatch(/^Because you liked .*(Star Wars|Empire)/)
    expect(await first.locator('[data-testid="movie-card-score"]').innerText()).toBe('100% match')
    await page.close()
  })

  it('keeps the picks and results after a refresh', async () => {
    const page = await open(`/?user=sam&liked=${STAR_WARS.id}`)
    await page.reload()
    await page.locator('[data-testid="movie-card"]').first().waitFor()
    expect(await chips(page).allInnerTexts()).toEqual([`${STAR_WARS.title} (${STAR_WARS.year})`])
    await page.close()
  })

  it('refetches recommendations after picking a movie', async () => {
    const page = await open()
    expect(await page.locator('[data-testid="recommendations-heading"]').innerText()).toBe('Recommendations Wall')
    await search(page, 'star wars')
    await page.locator(`[data-testid="movie-option-${STAR_WARS.id}"]`).click()
    await page.getByRole('heading', { name: 'Recommendations Wall' }).waitFor()
    expect(await page.locator('[data-testid="movie-card-title"]').allInnerTexts()).not.toContain(STAR_WARS.title)
    await page.close()
  })

  it('drops invalid and unknown ids from an old link', async () => {
    const page = await open(`/?user=sam&liked=${STAR_WARS.id},abc,9999,-3,${STAR_WARS.id},`)
    await page.locator('[data-testid="movie-card"]').first().waitFor()
    expect(await chips(page).allInnerTexts()).toEqual([`${STAR_WARS.title} (${STAR_WARS.year})`])
    await page.close()
  })

  it('falls back to popular results when no id in the URL is valid', async () => {
    const page = await open('/?user=sam&liked=abc,9999')
    await page.locator('[data-testid="movie-card"]').first().waitFor()
    expect(await page.locator('[data-testid="recommendations-heading"]').innerText()).toBe('Recommendations Wall')
    expect(await chips(page).count()).toBe(0)
    await page.close()
  })

  it('shows the empty state when every movie is picked', async () => {
    const all = movies.map(movie => movie.id).join(',')
    const page = await open(`/?user=sam&liked=${all}`)
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
    await gotoAs(page, `/?user=sam&liked=${STAR_WARS.id},${EMPIRE.id}`)
    await page.locator('[data-testid="movie-card"]').first().waitFor()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
    await page.close()
  })
})

import { describe, expect, it } from 'vitest'
import { $fetch, createPage, setup, url } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import type { RecommendationsResponse } from '../../shared/types'
import { failPoster, holdPosters, stubPosters } from './helpers/posters'

async function openHome(prepare: (page: Page) => Promise<unknown>) {
  const page = await createPage()
  await prepare(page)
  await page.goto(url('/?user=sam'))
  const poster = page.locator('[data-testid="poster"]').first()
  await poster.waitFor()
  return { page, poster }
}

async function size(poster: ReturnType<Page['locator']>) {
  const box = (await poster.boundingBox())!
  return { width: Math.round(box.width), height: Math.round(box.height) }
}

const isPainted = (canvas: HTMLCanvasElement) =>
  canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data.some(value => value !== 0)

await setup({ browser: true })

describe('PosterImage', () => {
  it('shows the blurhash first, then fades the real poster in', async () => {
    const page = await createPage()
    const held = await holdPosters(page)
    await page.goto(url('/?user=sam'))
    const poster = page.locator('[data-testid="poster"]').first()
    await poster.waitFor()

    expect(await poster.getAttribute('data-state')).toBe('loading')
    const blurhash = poster.locator('[data-testid="poster-blurhash"]')
    expect(await blurhash.isVisible()).toBe(true)
    expect(await blurhash.evaluate(isPainted)).toBe(true)
    expect(await poster.locator('[data-testid="poster-image"]').evaluate(img => getComputedStyle(img).opacity)).toBe('0')

    held.release()
    await page.waitForFunction(() => document.querySelector('[data-testid="poster"]')?.getAttribute('data-state') === 'loaded')
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-testid="poster-image"]')!).opacity === '1')
    await page.close()
  })

  it('gives the image alt text naming the movie', async () => {
    const { page, poster } = await openHome(stubPosters)
    const alt = await poster.locator('[data-testid="poster-image"]').getAttribute('alt')
    const title = await page.locator('[data-testid="movie-card-title"]').first().innerText()
    expect(alt).toBe(`Poster for ${title}`)
    await page.close()
  })

  it('keeps the blurhash and overlays the title when the image fails', async () => {
    const { page, poster } = await openHome(page => stubPosters(page, failPoster))
    await page.waitForFunction(() => document.querySelector('[data-testid="poster"]')?.getAttribute('data-state') === 'failed')

    const title = await page.locator('[data-testid="movie-card-title"]').first().innerText()
    expect(await poster.locator('[data-testid="poster-fallback-title"]').innerText()).toBe(title)
    expect(await poster.locator('[data-testid="poster-blurhash"]').isVisible()).toBe(true)
    expect(await poster.locator('[data-testid="poster-image"]').count()).toBe(0)
    await page.close()
  })

  it('keeps a fixed 2:3 box through loading, loaded and failed states', async () => {
    const page = await createPage()
    const held = await holdPosters(page)
    await page.goto(url('/?user=sam'))
    const poster = page.locator('[data-testid="poster"]').first()
    await poster.waitFor()

    const loading = await size(poster)
    expect(Math.abs(loading.height / loading.width - 1.5)).toBeLessThan(0.02)

    held.release()
    await page.waitForFunction(() => document.querySelector('[data-testid="poster"]')?.getAttribute('data-state') === 'loaded')
    expect(await size(poster)).toEqual(loading)
    await page.close()

    const failing = await openHome(page => stubPosters(page, failPoster))
    await failing.page.waitForFunction(() => document.querySelector('[data-testid="poster"]')?.getAttribute('data-state') === 'failed')
    expect(await size(failing.poster)).toEqual(loading)
    await failing.page.close()
  })
})

describe('MovieCard and RecommendationGrid', () => {
  it('renders a card per popular movie with title, year, reason and score', async () => {
    const expected = await $fetch<RecommendationsResponse>('/api/recommendations', { method: 'POST', body: { liked: [], limit: 12 } })
    const { page } = await openHome(stubPosters)

    expect(await page.locator('[data-testid="recommendations-heading"]').innerText()).toBe('Popular right now')
    const cards = page.locator('[data-testid="movie-card"]')
    expect(await cards.count()).toBe(12)
    expect(await cards.locator('[data-testid="movie-card-title"]').allInnerTexts()).toEqual(expected.items.map(item => item.movie.title))

    const first = cards.first()
    expect(await first.locator('[data-testid="movie-card-year"]').innerText()).toBe(String(expected.items[0]!.movie.year))
    expect(await first.locator('[data-testid="movie-card-reason"]').innerText()).toBe('Liked by many viewers')
    expect(await first.locator('[data-testid="movie-card-score"]').innerText()).toBe('100% as popular as #1')
    await page.close()
  })
})

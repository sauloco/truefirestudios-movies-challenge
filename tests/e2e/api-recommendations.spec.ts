import { beforeAll, describe, expect, it } from 'vitest'
import { fetch, setup } from '@nuxt/test-utils/e2e'
import type { Movie, RecommendationsResponse } from '../../shared/types'

const STAR_WARS = 20
const EMPIRE = 59
const RAIDERS = 60
const RETURN_OF_THE_JEDI = 66

async function post(body: unknown) {
  return fetch('/api/recommendations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
}

async function recommendations(body: unknown): Promise<RecommendationsResponse> {
  const response = await post(body)
  expect(response.status).toBe(200)
  return await response.json() as RecommendationsResponse
}

describe('POST /api/recommendations', async () => {
  await setup()

  let catalog: Movie[] = []
  let allIds: number[] = []
  beforeAll(async () => {
    catalog = await (await fetch('/api/movies')).json() as Movie[]
    allIds = catalog.map(movie => movie.id)
  })

  describe('personalised results', () => {
    const picks = [STAR_WARS, EMPIRE, RAIDERS]

    it('puts Return of the Jedi in the top 3 for Star Wars + Empire + Raiders', async () => {
      const result = await recommendations({ liked: picks })
      expect(result.source).toBe('personalized')
      const top3 = result.items.slice(0, 3).map(item => item.movie.id)
      expect(top3).toContain(RETURN_OF_THE_JEDI)
      expect(result.items[0]!.movie.title).toBe('Return of the Jedi')
    })

    it('never recommends a picked movie', async () => {
      const result = await recommendations({ liked: picks, limit: 50 })
      const ids = result.items.map(item => item.movie.id)
      for (const pick of picks) expect(ids).not.toContain(pick)
    })

    it('is deterministic', async () => {
      const first = await recommendations({ liked: picks, limit: 20 })
      const second = await recommendations({ liked: [...picks].reverse(), limit: 20 })
      expect(second).toEqual(first)
    })

    it('returns normalised scores in descending order with the full Movie shape', async () => {
      const { items } = await recommendations({ liked: picks, limit: 20 })
      expect(items.length).toBeGreaterThan(3)
      expect(items[0]!.score).toBe(1)
      for (const [index, item] of items.entries()) {
        expect(item.score).toBeGreaterThan(0)
        expect(item.score).toBeLessThanOrEqual(1)
        if (index > 0) expect(item.score).toBeLessThanOrEqual(items[index - 1]!.score)
        expect(item.movie).toEqual({
          id: expect.any(Number),
          title: expect.any(String),
          year: expect.any(Number),
          posterUrl: expect.stringMatching(/^https:\/\/image\.tmdb\.org\/t\/p\/w342\/.+/),
          blurhash: expect.stringMatching(/\S/),
          overview: expect.stringMatching(/\S/),
          genres: expect.arrayContaining([expect.any(String)])
        })
      }
    })

    it('explains each result with 1-3 of the picks', async () => {
      const { items } = await recommendations({ liked: picks, limit: 20 })
      for (const item of items) {
        expect(item.because.length).toBeGreaterThanOrEqual(1)
        expect(item.because.length).toBeLessThanOrEqual(3)
        for (const reason of item.because) {
          expect(picks).toContain(reason.id)
          expect(reason.title).toBe(catalog.find(movie => movie.id === reason.id)!.title)
        }
      }
    })

    it('handles a single pick', async () => {
      const result = await recommendations({ liked: [STAR_WARS] })
      expect(result.source).toBe('personalized')
      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items.map(item => item.movie.id)).not.toContain(STAR_WARS)
      for (const item of result.items) expect(item.because).toEqual([{ id: STAR_WARS, title: 'Star Wars' }])
    })

    it('returns nothing when every movie is picked', async () => {
      const result = await recommendations({ liked: allIds })
      expect(allIds).toHaveLength(70)
      expect(result.items).toEqual([])
    })

    it('treats duplicate ids as one pick', async () => {
      const once = await recommendations({ liked: picks })
      const repeated = await recommendations({ liked: [STAR_WARS, STAR_WARS, EMPIRE, RAIDERS, EMPIRE] })
      expect(repeated).toEqual(once)
    })

    it('defaults the limit to 10 and honours the bounds', async () => {
      expect((await recommendations({ liked: picks })).items).toHaveLength(10)
      expect((await recommendations({ liked: picks, limit: 1 })).items).toHaveLength(1)
      expect((await recommendations({ liked: picks, limit: 50 })).items.length).toBeLessThanOrEqual(50)
    })
  })

  describe('cold start', () => {
    it('returns the most liked movies as popular when nothing is picked', async () => {
      const result = await recommendations({ liked: [] })
      expect(result.source).toBe('popular')
      expect(result.items).toHaveLength(10)
      expect(result.items[0]!.movie.title).toBe('Star Wars')
      expect(result.items[0]!.score).toBe(1)
      for (const item of result.items) expect(item.because).toEqual([])
      const scores = result.items.map(item => item.score)
      expect(scores).toEqual([...scores].sort((a, b) => b - a))
    })

    it('is deterministic and honours limit', async () => {
      const first = await recommendations({ liked: [], limit: 5 })
      expect(first.items).toHaveLength(5)
      expect(await recommendations({ liked: [], limit: 5 })).toEqual(first)
    })
  })

  describe('validation', () => {
    it('400s on an unknown movie id', async () => {
      const response = await post({ liked: [STAR_WARS, 9999] })
      expect(response.status).toBe(400)
    })

    it('400s when limit is out of range', async () => {
      for (const limit of [0, -1, 51, 1000]) {
        expect((await post({ liked: [STAR_WARS], limit })).status, `limit ${limit}`).toBe(400)
      }
    })

    it('422s when the body fails the schema', async () => {
      const invalid = [
        {},
        { liked: 'abc' },
        { liked: ['20'] },
        { liked: [1.5] },
        { liked: [null] },
        { liked: [STAR_WARS], limit: '5' },
        { liked: [STAR_WARS], limit: 2.5 },
        { liked: [STAR_WARS], extra: true },
        [STAR_WARS],
        null
      ]
      for (const body of invalid) {
        expect((await post(body)).status, JSON.stringify(body)).toBe(422)
      }
    })
  })

  it('does not leak user data', async () => {
    const bodies = await Promise.all([
      post({ liked: [STAR_WARS, EMPIRE, RAIDERS], limit: 50 }).then(response => response.text()),
      post({ liked: [] }).then(response => response.text()),
      post({ liked: [9999] }).then(response => response.text()),
      post({ liked: 'abc' }).then(response => response.text())
    ])
    for (const body of bodies) {
      expect(body).not.toContain('user_id')
      expect(body).not.toContain('users')
    }
    const { items } = JSON.parse(bodies[0]!) as RecommendationsResponse
    for (const item of items) {
      expect(Object.keys(item).sort()).toEqual(['because', 'movie', 'score'])
    }
  })
})

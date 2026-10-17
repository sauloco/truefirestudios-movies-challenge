import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import type { Movie } from '../../shared/types'

const POSTER_URL = /^https:\/\/image\.tmdb\.org\/t\/p\/w342\/[\w-]+\.jpg$/

describe('GET /api/movies', async () => {
  await setup()

  it('lists all 70 movies with the Movie shape', async () => {
    const movies = await $fetch<Movie[]>('/api/movies')
    expect(movies).toHaveLength(70)
    for (const movie of movies) {
      expect(movie).toEqual({
        id: expect.any(Number),
        title: expect.any(String),
        year: expect.any(Number),
        posterUrl: expect.stringMatching(POSTER_URL),
        overview: expect.stringMatching(/\S/),
        genres: expect.arrayContaining([expect.any(String)])
      })
      expect(movie.year).toBeGreaterThanOrEqual(1950)
    }
    expect(new Set(movies.map(movie => movie.id)).size).toBe(70)
  })

  it('is sorted by title', async () => {
    const movies = await $fetch<Movie[]>('/api/movies')
    const titles = movies.map(movie => movie.title)
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)))
  })

  it('restores leading articles and splits the year out of the title', async () => {
    const movies = await $fetch<Movie[]>('/api/movies')
    const byId = new Map(movies.map(movie => [movie.id, movie]))
    expect(byId.get(6)).toMatchObject({ title: 'The Usual Suspects', year: 1995 })
    expect(byId.get(7)).toMatchObject({ title: 'Il Postino', year: 1994 })
    expect(byId.get(49)).toMatchObject({ title: 'A Fish Called Wanda', year: 1988 })
    expect(byId.get(63)).toMatchObject({ title: 'The Good, The Bad and The Ugly', year: 1966 })
    expect(byId.get(5)).toMatchObject({ title: 'Seven (Se7en)', year: 1995 })
    expect(movies.some(movie => /, (The|A|Il)$/.test(movie.title))).toBe(false)
  })

  it('joins TMDB metadata onto the dataset titles', async () => {
    const movies = await $fetch<Movie[]>('/api/movies')
    const toyStory = movies.find(movie => movie.id === 1)!
    expect(toyStory.posterUrl).toBe('https://image.tmdb.org/t/p/w342/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg')
    expect(toyStory.overview).toContain('Woody')
    expect(toyStory.genres).toContain('Animation')
  })

  it('does not leak user data', async () => {
    const body = JSON.stringify(await $fetch('/api/movies'))
    expect(body).not.toContain('user_id')
    expect(body).not.toContain('users')
    for (const movie of JSON.parse(body) as Movie[]) {
      expect(Object.keys(movie).sort()).toEqual(['genres', 'id', 'overview', 'posterUrl', 'title', 'year'])
    }
  })
})

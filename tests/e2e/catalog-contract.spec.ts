import { readFileSync } from 'node:fs'
import { isBlurhashValid } from 'blurhash'
import { describe, expect, it } from 'vitest'

interface CatalogEntry {
  id: number
  tmdbId: number
  title: string
  year: number
  overview: string
  genres: string[]
  posterPath: string
  blurhash: string
}

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'))
const movieIds = Object.keys(read('server/assets/movies.json').movies).map(Number)
const catalog = read('server/assets/catalog.json') as CatalogEntry[]

describe('catalog data contract', () => {
  it('has an entry for each of the 70 movie ids and nothing else', () => {
    expect(movieIds).toHaveLength(70)
    expect(catalog.map(entry => entry.id).sort((a, b) => a - b)).toEqual([...movieIds].sort((a, b) => a - b))
  })

  it.each(movieIds)('movie %i has a TMDB poster path and a valid blurhash', (id) => {
    const entry = catalog.find(candidate => candidate.id === id)!
    expect(entry.posterPath).toMatch(/^\/[\w-]+\.jpg$/)
    expect(isBlurhashValid(entry.blurhash)).toEqual({ result: true })
    expect(entry.tmdbId).toBeGreaterThan(0)
    expect(entry.overview).toMatch(/\S/)
    expect(entry.genres.length).toBeGreaterThan(0)
  })

  it('maps distinct movies to distinct TMDB ids', () => {
    expect(new Set(catalog.map(entry => entry.tmdbId)).size).toBe(catalog.length)
  })
})

// Resolves every movie in server/assets/movies.json against TMDB and writes
// server/assets/catalog.json (overview, genres, poster path, blurhash).
//
//   npm run build-catalog
//   npm run build-catalog -- --out catalog.json --movies movies.json
//
// Credentials come from TMDB_READ_ACCESS_TOKEN (preferred, sent as a Bearer header) or
// TMDB_API_KEY, read from the environment or from a .env file in the working directory.
// TMDB_BASE_URL and TMDB_IMAGE_BASE_URL point the script at another host (the e2e tests
// use a local fixture server). Each poster is downloaded once to compute its blurhash and
// is then discarded: only the TMDB poster path is stored.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { encode } from 'blurhash'
import jpeg from 'jpeg-js'
import { parseTitle, titleKey } from '../server/utils/titles.ts'

const DEFAULT_TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const DEFAULT_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'
// Smallest poster size that is plenty for a 4x3 blurhash
const HASH_POSTER_SIZE = 'w92'
const BLURHASH_COMPONENTS = { x: 4, y: 3 }
const CONCURRENCY = 5

// MovieLens id -> TMDB id for titles the year + title search cannot resolve on its own
export const OVERRIDES: Record<number, number> = {
  3: 63, // Twelve Monkeys (1995), TMDB lists it as "12 Monkeys"
  5: 807, // Seven (Se7en) (1995)
  7: 11010, // Il Postino (1994), TMDB lists it as "The Postman"
  45: 602 // Independence Day (ID4) (1996), a tie-in documentary otherwise wins the search
}

interface SourceMovie {
  id: number
  title: string
  year: number
}

interface SearchResult {
  id: number
  title: string
  original_title: string
  poster_path: string | null
}

interface MovieDetails {
  id: number
  overview: string
  poster_path: string | null
  genres: { name: string }[]
}

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

class FatalError extends Error {}

const { values: options } = parseArgs({
  options: {
    out: { type: 'string', default: 'server/assets/catalog.json' },
    movies: { type: 'string', default: 'server/assets/movies.json' }
  }
})

if (existsSync('.env')) process.loadEnvFile('.env')

const baseUrl = (process.env.TMDB_BASE_URL || DEFAULT_TMDB_BASE_URL).replace(/\/+$/, '')
const imageBaseUrl = (process.env.TMDB_IMAGE_BASE_URL || DEFAULT_IMAGE_BASE_URL).replace(/\/+$/, '')
const token = process.env.TMDB_READ_ACCESS_TOKEN
const apiKey = process.env.TMDB_API_KEY

async function tmdb<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(`${baseUrl}${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value))
  if (!token) url.searchParams.set('api_key', apiKey!)

  const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (response.status === 401) {
    throw new FatalError('TMDB rejected the credentials (401). Check TMDB_READ_ACCESS_TOKEN / TMDB_API_KEY.')
  }
  if (!response.ok) throw new Error(`TMDB ${path} responded ${response.status}`)
  return await response.json() as T
}

async function search(movie: SourceMovie, year: number): Promise<SearchResult[]> {
  const { results } = await tmdb<{ results: SearchResult[] }>('/search/movie', { query: movie.title, year })
  return results.filter(result => result.poster_path)
}

// Prefers a result whose title matches ours, then falls back to the top search hit.
// MovieLens years are occasionally off by one, so neighbouring years are tried last.
async function resolveTmdbId(movie: SourceMovie): Promise<number | undefined> {
  const override = OVERRIDES[movie.id]
  if (override) return override

  const wanted = titleKey(movie.title)
  for (const year of [movie.year, movie.year - 1, movie.year + 1]) {
    const results = await search(movie, year)
    const exact = results.find(result => [result.title, result.original_title].some(name => titleKey(name) === wanted))
    const match = exact ?? (year === movie.year ? results[0] : undefined)
    if (match) return match.id
  }
}

async function posterBlurhash(posterPath: string): Promise<string> {
  const response = await fetch(`${imageBaseUrl}/${HASH_POSTER_SIZE}${posterPath}`)
  if (!response.ok) throw new Error(`poster ${posterPath} responded ${response.status}`)
  const { data, width, height } = jpeg.decode(Buffer.from(await response.arrayBuffer()), { useTArray: true })
  return encode(new Uint8ClampedArray(data), width, height, BLURHASH_COMPONENTS.x, BLURHASH_COMPONENTS.y)
}

async function buildEntry(movie: SourceMovie): Promise<CatalogEntry> {
  const tmdbId = await resolveTmdbId(movie)
  if (!tmdbId) throw new Error('no TMDB match with a poster')
  const details = await tmdb<MovieDetails>(`/movie/${tmdbId}`)
  if (!details.poster_path) throw new Error(`TMDB movie ${tmdbId} has no poster`)
  return {
    id: movie.id,
    tmdbId,
    title: movie.title,
    year: movie.year,
    overview: details.overview,
    genres: details.genres.map(genre => genre.name),
    posterPath: details.poster_path,
    blurhash: await posterBlurhash(details.poster_path)
  }
}

// Runs the tasks with a small worker pool and keeps the results in input order
async function mapPool<T, R>(items: T[], worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await worker(items[index]!)
    }
  }))
  return results
}

async function main() {
  if (!token && !apiKey) {
    throw new FatalError('Missing TMDB credentials: set TMDB_READ_ACCESS_TOKEN or TMDB_API_KEY in the environment or in a .env file.')
  }

  const raw = JSON.parse(readFileSync(resolve(options.movies), 'utf8')) as { movies: Record<string, string> }
  const movies = Object.entries(raw.movies).map(([id, title]) => ({ id: Number(id), ...parseTitle(title) }))

  const failures: { movie: SourceMovie, reason: string }[] = []
  const entries = await mapPool(movies, async (movie) => {
    try {
      return await buildEntry(movie)
    } catch (error) {
      if (error instanceof FatalError) throw error
      failures.push({ movie, reason: error instanceof Error ? error.message : String(error) })
    }
  })

  if (failures.length) {
    console.error(`Could not resolve ${failures.length} of ${movies.length} movies:`)
    for (const { movie, reason } of failures.sort((a, b) => a.movie.id - b.movie.id)) {
      console.error(`  ${movie.id}: ${movie.title} (${movie.year}) - ${reason}`)
    }
    console.error('Add an entry to OVERRIDES in scripts/build-catalog.ts for each mismatch.')
    process.exitCode = 1
    return
  }

  const catalog = entries.filter((entry): entry is CatalogEntry => Boolean(entry)).sort((a, b) => a.id - b.id)
  writeFileSync(resolve(options.out), `${JSON.stringify(catalog, null, 2)}\n`)
  console.log(`Wrote ${catalog.length} catalog entries to ${options.out}`)
}

main().catch((error) => {
  console.error(error instanceof FatalError ? error.message : error)
  process.exitCode = 1
})

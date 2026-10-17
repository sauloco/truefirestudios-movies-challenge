import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { isBlurhashValid } from 'blurhash'
import jpeg from 'jpeg-js'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import fixture from './fixtures/tmdb.json' with { type: 'json' }

const SCRIPT = resolve('scripts/build-catalog.ts')
const TOKEN = 'fixture-read-access-token'
const API_KEY = 'fixture-api-key'

// Tiny gradient standing in for a poster; the script only needs a decodable JPEG
function posterJpeg(): Buffer {
  const width = 8
  const height = 12
  const data = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data.set([(i * 7) % 256, (i * 13) % 256, (i * 29) % 256, 255], i * 4)
  }
  return jpeg.encode({ data, width, height }, 90).data
}

// Serves the recorded TMDB responses plus a poster image, and checks the credentials
function startFixtureServer(): Promise<Server> {
  const poster = posterJpeg()
  const search = fixture.search as Record<string, unknown[]>
  const movies = fixture.movies as Record<string, unknown>
  const server = createServer((request, response) => {
    const url = new URL(request.url!, 'http://fixture')
    const json = (status: number, body: unknown) => {
      response.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body))
    }

    if (url.pathname.startsWith('/img/')) {
      response.writeHead(200, { 'content-type': 'image/jpeg' }).end(poster)
      return
    }

    const authorised = request.headers.authorization === `Bearer ${TOKEN}` || url.searchParams.get('api_key') === API_KEY
    if (!authorised) return json(401, { success: false, status_code: 7 })

    if (url.pathname === '/3/search/movie') {
      const key = `${url.searchParams.get('query')}|${url.searchParams.get('year')}`
      return json(200, { page: 1, results: search[key] ?? [] })
    }
    const details = /^\/3\/movie\/(\d+)$/.exec(url.pathname)
    const movie = details && movies[details[1]!]
    return movie ? json(200, movie) : json(404, { success: false, status_code: 34 })
  })
  return new Promise(done => server.listen(0, '127.0.0.1', () => done(server)))
}

interface RunResult {
  code: number | null
  stdout: string
  stderr: string
}

describe('scripts/build-catalog', () => {
  let server: Server
  let workdir: string
  let fixtureUrl: string

  beforeAll(async () => {
    server = await startFixtureServer()
    fixtureUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(() => {
    server.close()
  })

  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), 'build-catalog-'))
    return () => rmSync(workdir, { recursive: true, force: true })
  })

  function writeMovies(movies: Record<string, string>) {
    writeFileSync(join(workdir, 'movies.json'), JSON.stringify({ movies, users: [] }))
  }

  // Runs the script as a child process in an empty directory with only the given credentials
  function run(credentials: Record<string, string>): Promise<RunResult> {
    const env: Record<string, string | undefined> = { ...process.env, TMDB_READ_ACCESS_TOKEN: undefined, TMDB_API_KEY: undefined }
    Object.assign(env, credentials, { TMDB_BASE_URL: `${fixtureUrl}/3`, TMDB_IMAGE_BASE_URL: `${fixtureUrl}/img` })
    return new Promise((done, fail) => {
      const child = spawn(process.execPath, [SCRIPT, '--movies', 'movies.json', '--out', 'catalog.json'], { cwd: workdir, env })
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', chunk => (stdout += chunk))
      child.stderr.on('data', chunk => (stderr += chunk))
      child.on('error', fail)
      child.on('close', code => done({ code, stdout, stderr }))
    })
  }

  const readCatalog = () => JSON.parse(readFileSync(join(workdir, 'catalog.json'), 'utf8'))

  it('writes a catalog entry with a valid blurhash for every resolved movie', async () => {
    // Toy Story resolves through the title + year search, Il Postino through the override map
    writeMovies({ 1: 'Toy Story (1995)', 7: 'Postino, Il (1994)' })
    const result = await run({ TMDB_READ_ACCESS_TOKEN: TOKEN })

    expect(result.stderr).toBe('')
    expect(result.code).toBe(0)
    const catalog = readCatalog()
    expect(catalog).toEqual([
      {
        id: 1,
        tmdbId: 862,
        title: 'Toy Story',
        year: 1995,
        overview: expect.stringContaining('Woody'),
        genres: expect.arrayContaining(['Animation']),
        posterPath: '/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg',
        blurhash: expect.any(String)
      },
      {
        id: 7,
        tmdbId: 11010,
        title: 'Il Postino',
        year: 1994,
        overview: expect.any(String),
        genres: expect.any(Array),
        posterPath: expect.stringMatching(/^\/.+\.jpg$/),
        blurhash: expect.any(String)
      }
    ])
    for (const entry of catalog) {
      expect(isBlurhashValid(entry.blurhash).result).toBe(true)
      expect(entry.overview).not.toBe('')
      expect(entry.genres.length).toBeGreaterThan(0)
    }
  })

  it('falls back to the API key when there is no read access token', async () => {
    writeMovies({ 1: 'Toy Story (1995)' })
    const result = await run({ TMDB_API_KEY: API_KEY })

    expect(result.code).toBe(0)
    expect(readCatalog()).toHaveLength(1)
  })

  it('reports unmatched titles, exits non-zero and writes nothing', async () => {
    writeMovies({ 1: 'Toy Story (1995)', 99: 'Nonexistent Film, The (1999)' })
    const result = await run({ TMDB_READ_ACCESS_TOKEN: TOKEN })

    expect(result.code).toBe(1)
    expect(result.stderr).toContain('Could not resolve 1 of 2 movies')
    expect(result.stderr).toContain('99: The Nonexistent Film (1999)')
    expect(result.stderr).not.toContain('Toy Story')
    expect(existsSync(join(workdir, 'catalog.json'))).toBe(false)
  })

  it('exits non-zero with a clear error when no credentials are set', async () => {
    writeMovies({ 1: 'Toy Story (1995)' })
    const result = await run({})

    expect(result.code).toBe(1)
    expect(result.stderr).toContain('Missing TMDB credentials')
    expect(result.stderr).toContain('TMDB_READ_ACCESS_TOKEN')
    expect(existsSync(join(workdir, 'catalog.json'))).toBe(false)
  })

  it('exits non-zero when TMDB rejects the credentials', async () => {
    writeMovies({ 1: 'Toy Story (1995)' })
    const result = await run({ TMDB_READ_ACCESS_TOKEN: 'wrong' })

    expect(result.code).toBe(1)
    expect(result.stderr).toContain('TMDB rejected the credentials')
    expect(existsSync(join(workdir, 'catalog.json'))).toBe(false)
  })

  it('reads credentials from a .env file in the working directory', async () => {
    writeMovies({ 1: 'Toy Story (1995)' })
    writeFileSync(join(workdir, '.env'), `TMDB_READ_ACCESS_TOKEN=${TOKEN}\n`)
    const result = await run({})

    expect(result.code).toBe(0)
    expect(readCatalog()).toHaveLength(1)
  })
})

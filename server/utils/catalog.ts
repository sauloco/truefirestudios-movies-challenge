import type { Movie } from '#shared/types'
import raw from '../assets/catalog.json' with { type: 'json' }
import { getDataset } from './dataset.ts'

// Poster width served to the browser; the CDN offers w92, w154, w185, w342, w500, w780
const POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w342'

let movies: Map<number, Movie> | undefined

// Every movie in the dataset joined with its TMDB metadata from catalog.json
export function getMovies(): Map<number, Movie> {
  if (!movies) {
    const entries = new Map(raw.map(entry => [entry.id, entry]))
    movies = new Map(getDataset().movies.map(({ id, title, year }) => {
      const entry = entries.get(id)
      if (!entry) throw new Error(`Movie ${id} (${title}) is missing from catalog.json; run \`npm run build-catalog\``)
      return [id, { id, title, year, posterUrl: `${POSTER_BASE_URL}${entry.posterPath}`, blurhash: entry.blurhash, overview: entry.overview, genres: entry.genres }]
    }))
  }
  return movies
}

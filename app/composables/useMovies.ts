import type { Movie } from '#shared/types'

// The whole 70-movie catalog, fetched once and shared by key
export function useMovies() {
  return useFetch<Movie[]>('/api/movies', { key: 'movies', default: () => [] })
}

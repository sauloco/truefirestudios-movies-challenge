import type { Movie } from '#shared/types'

export default defineEventHandler((): Movie[] => {
  return [...getMovies().values()].sort((a, b) => a.title.localeCompare(b.title))
})

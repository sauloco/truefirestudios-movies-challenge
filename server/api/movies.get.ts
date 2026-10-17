import type { Movie } from '#shared/types'

export default defineEventHandler((): Movie[] => {
  return getDataset().movies
    .map(({ id, title, year }) => ({ id, title, year, posterUrl: null, overview: '', genres: [] }))
    .sort((a, b) => a.title.localeCompare(b.title))
})

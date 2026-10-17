import type { RecommendationsResponse } from '#shared/types'

export default defineEventHandler(async (event): Promise<RecommendationsResponse> => {
  const parsed = recommendationsBodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity',
      message: 'Request body must be { liked: number[], limit?: number }'
    })
  }

  const limit = parsed.data.limit ?? DEFAULT_LIMIT
  if (limit < MIN_LIMIT || limit > MAX_LIMIT) {
    throw createError({ statusCode: 400, message: `limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}` })
  }

  const catalog = new Map(getDataset().movies.map(movie => [movie.id, movie]))
  const unknown = parsed.data.liked.filter(id => !catalog.has(id))
  if (unknown.length) {
    throw createError({ statusCode: 400, message: `Unknown movie ids: ${[...new Set(unknown)].join(', ')}` })
  }

  const picks = [...new Set(parsed.data.liked)]
  const { source, items } = recommend(getModel(), picks, { limit })
  const reference = (id: number) => ({ id, title: catalog.get(id)!.title })

  return {
    source,
    items: items.map(item => {
      const { id, title, year } = catalog.get(item.id)!
      return {
        movie: { id, title, year, posterUrl: null, overview: '', genres: [] },
        score: item.score,
        because: item.because.map(reference)
      }
    })
  }
})

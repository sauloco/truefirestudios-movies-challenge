import { z } from 'zod'

export const DEFAULT_LIMIT = 10
export const MIN_LIMIT = 1
export const MAX_LIMIT = 50

// Shape only. Semantic checks (known ids, limit range) are answered with 400 by the endpoint.
export const recommendationsBodySchema = z.strictObject({
  liked: z.array(z.number().int()),
  limit: z.number().int().optional()
})

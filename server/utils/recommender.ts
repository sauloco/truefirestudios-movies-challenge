import type { Dataset } from './dataset.ts'
import { getDataset } from './dataset.ts'

/**
 * Popularity damping for the item-item similarity
 *   sim(p -> c) = coLikes(p, c) / (likes(p)^(1 - alpha) * likes(c)^alpha)
 * alpha = 0.5 is plain cosine similarity; higher values penalise blockbusters so
 * suggestions are more tailored, at the cost of leave-one-out accuracy.
 * Tuned with `npm run evaluate` (see scripts/evaluate.ts), leave-one-out hit@5 over the
 * 684 users with >= 5 likes, MIN_CO_LIKES = 3:
 *   most-popular baseline 0.487 | alpha 0.50 0.545 | 0.55 0.512 | 0.60 0.504 | 0.625 0.496
 *   0.65 0.482 | 0.675 0.471 | 0.70 0.465 | 0.80 0.406
 * 0.60 is the most accurate value in the 0.6-0.65 band that still beats the baseline
 * while keeping results tailored (0.50 gives blockbusters to everyone).
 */
export const POPULARITY_ALPHA = 0.6

// Movie pairs liked together by fewer users than this are treated as noise
export const MIN_CO_LIKES = 3

// How many contributing picks are reported per result
export const MAX_BECAUSE = 3

export interface RankedMovie {
  id: number
  score: number
  because: number[]
}

export interface RecommendOptions {
  limit: number
  alpha?: number
  minCoLikes?: number
}

export interface RecommendResult {
  source: 'personalized' | 'popular'
  items: RankedMovie[]
}

export interface Model {
  movieIds: number[]
  likes: Map<number, number>
  coLikes: Map<number, Map<number, number>>
}

export function buildModel({ movies, users }: Dataset): Model {
  const likes = new Map<number, number>(movies.map(movie => [movie.id, 0]))
  const coLikes = new Map<number, Map<number, number>>(movies.map(movie => [movie.id, new Map()]))
  for (const liked of users) {
    const unique = [...new Set(liked)]
    for (const a of unique) {
      likes.set(a, (likes.get(a) ?? 0) + 1)
      for (const b of unique) {
        if (a === b) continue
        const row = coLikes.get(a)!
        row.set(b, (row.get(b) ?? 0) + 1)
      }
    }
  }
  return { movieIds: movies.map(movie => movie.id), likes, coLikes }
}

let model: Model | undefined

// Built once per process on first use
export function getModel(): Model {
  model ??= buildModel(getDataset())
  return model
}

// Most liked first; ties broken by id so output is deterministic
function byPopularity(model: Model) {
  return (a: number, b: number) => (model.likes.get(b)! - model.likes.get(a)!) || a - b
}

export function recommend(model: Model, picks: readonly number[], options: RecommendOptions): RecommendResult {
  const { limit, alpha = POPULARITY_ALPHA, minCoLikes = MIN_CO_LIKES } = options
  // Ascending ids so float summation, and therefore scores, never depend on pick order
  const picked = new Set([...picks].sort((a, b) => a - b))
  const popularity = byPopularity(model)

  if (picked.size === 0) {
    const top = [...model.movieIds].sort(popularity).slice(0, limit)
    const max = model.likes.get(top[0]!) || 1
    return {
      source: 'popular',
      items: top.map(id => ({ id, score: model.likes.get(id)! / max, because: [] }))
    }
  }

  const contributions = new Map<number, Map<number, number>>()
  const totals = new Map<number, number>()
  for (const pick of picked) {
    const pickLikes = model.likes.get(pick)!
    for (const [candidate, together] of model.coLikes.get(pick)!) {
      if (picked.has(candidate) || together < minCoLikes) continue
      const similarity = together / (pickLikes ** (1 - alpha) * model.likes.get(candidate)! ** alpha)
      totals.set(candidate, (totals.get(candidate) ?? 0) + similarity)
      if (!contributions.has(candidate)) contributions.set(candidate, new Map())
      contributions.get(candidate)!.set(pick, similarity)
    }
  }

  const ranked = [...totals.keys()].sort((a, b) => (totals.get(b)! - totals.get(a)!) || popularity(a, b)).slice(0, limit)
  const max = ranked.length ? totals.get(ranked[0]!)! : 1
  return {
    source: 'personalized',
    items: ranked.map(id => ({
      id,
      score: totals.get(id)! / max,
      because: [...contributions.get(id)!]
        .sort(([idA, a], [idB, b]) => (b - a) || idA - idB)
        .slice(0, MAX_BECAUSE)
        .map(([pick]) => pick)
    }))
  }
}

export interface Movie {
  id: number
  title: string
  year: number
  posterUrl: string | null
  blurhash: string
  overview: string
  genres: string[]
}

export interface MovieReference {
  id: number
  title: string
}

export interface Recommendation {
  movie: Movie
  score: number
  because: MovieReference[]
}

export interface RecommendationsResponse {
  source: 'personalized' | 'popular'
  items: Recommendation[]
}

export interface RecommendationsRequest {
  liked: number[]
  limit?: number
}

export type Language = 'en' | 'es' | 'ja'

export type WallPattern = 'hexagons' | 'groovy' | 'circles' | 'brick'

export interface Profile {
  id: string
  name: string
  avatarUrl: string
  // Pastel backdrop so the transparent line-art avatar stays visible on the dark theme
  tint: string
  // Hero Patterns motif printed on the walls of this viewer's room (files in public/patterns)
  pattern: WallPattern
  language: Language
  liked: number[]
}

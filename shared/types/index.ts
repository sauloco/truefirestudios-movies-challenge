export interface Movie {
  id: number
  title: string
  year: number
  posterUrl: string
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

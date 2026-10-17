import raw from '../assets/movies.json'
import { parseTitle } from './titles'

export interface DatasetMovie {
  id: number
  title: string
  year: number
}

export interface Dataset {
  movies: DatasetMovie[]
  // Liked movie ids per user. Never exposed through the API.
  users: number[][]
}

let dataset: Dataset | undefined

export function getDataset(): Dataset {
  dataset ??= {
    movies: Object.entries(raw.movies).map(([id, title]) => ({ id: Number(id), ...parseTitle(title) })),
    users: raw.users.map(user => user.movies)
  }
  return dataset
}

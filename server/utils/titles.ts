const TITLE_PATTERN = /^(.*) \((\d{4})\)$/
// Leading articles MovieLens moves to the end: "Usual Suspects, The"
const TRAILING_ARTICLE = /^(.*), (The|A|An|Il|La|Le|Les|L'|Das|Der|Die|El)$/

export interface ParsedTitle {
  title: string
  year: number
}

export function parseTitle(raw: string): ParsedTitle {
  const match = TITLE_PATTERN.exec(raw.trim())
  if (!match) {
    throw new Error(`Unrecognised movie title format: "${raw}"`)
  }
  const name = match[1]!
  const article = TRAILING_ARTICLE.exec(name)
  const title = article ? joinArticle(article[2]!, article[1]!) : name
  return { title, year: Number(match[2]) }
}

function joinArticle(article: string, rest: string): string {
  return article.endsWith('\'') ? `${article}${rest}` : `${article} ${rest}`
}

// Lowercased, punctuation-free key for case-insensitive title lookups
export function titleKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

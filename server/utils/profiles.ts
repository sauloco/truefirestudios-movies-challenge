import type { Language, Profile } from '#shared/types'

interface ProfileDefinition extends Omit<Profile, 'liked'> {
  // 1-based user_id in movies.json; the profile's likes are read from there, not copied
  datasetUserId: number
}

const DEFINITIONS: ProfileDefinition[] = [
  { id: 'sam', name: 'Sam Okafor', avatarUrl: '/users/sam.png', tint: '#bfdbfe', pattern: 'hexagons', language: 'en', datasetUserId: 1 },
  { id: 'yuki', name: 'Yuki Tanaka', avatarUrl: '/users/yuki.png', tint: '#fbcfe8', pattern: 'groovy', language: 'ja', datasetUserId: 2 },
  { id: 'lucia', name: 'Lucía Navarro', avatarUrl: '/users/lucia.png', tint: '#fde68a', pattern: 'circles', language: 'es', datasetUserId: 3 },
  { id: 'dale', name: 'Dale Whitfield', avatarUrl: '/users/dale.png', tint: '#e9a58f', pattern: 'brick', language: 'en', datasetUserId: 4 }
]

const LANGUAGES: Language[] = ['en', 'es', 'ja']

function loadProfiles(): Profile[] {
  const { users } = getDataset()
  const catalog = getMovies()
  return DEFINITIONS.map(({ datasetUserId, ...definition }) => {
    const liked = users[datasetUserId - 1]
    if (!liked) throw new Error(`Profile ${definition.id} maps to dataset user ${datasetUserId}, which does not exist`)
    if (!LANGUAGES.includes(definition.language)) throw new Error(`Profile ${definition.id} has an unsupported language ${definition.language}`)
    const missing = liked.find(id => !catalog.has(id))
    if (missing !== undefined) throw new Error(`Profile ${definition.id} likes movie ${missing}, which is not in the catalog`)
    return { ...definition, liked: [...liked] }
  })
}

// Validated once when the module loads, so a bad mapping fails fast instead of at the first request
const profiles = loadProfiles()

// The four demo viewers. No authentication: anyone can act as any of them.
export function getProfiles(): Profile[] {
  return profiles
}

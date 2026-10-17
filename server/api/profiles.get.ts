import type { Profile } from '#shared/types'

export default defineEventHandler((): Profile[] => {
  return getProfiles()
})

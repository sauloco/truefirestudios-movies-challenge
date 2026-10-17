// Every page needs a viewer. A missing or unknown `?user=` is filled from the cookie, else the first profile.
// Only then are the viewer's likes seeded, and never over picks that are already in the URL, so shared links keep their picks
// and `?user=sam` without `liked` stays "no picks" (removing the last chip must not reseed).
export default defineNuxtRouteMiddleware(async (to) => {
  const { data: profiles } = await useProfileList()
  const remembered = useProfileCookie()

  const requested = findProfile(profiles.value, to.query.user)
  if (requested) {
    remembered.value = requested.id
    return
  }

  const profile = findProfile(profiles.value, remembered.value) ?? profiles.value[0]
  if (!profile) return
  const { user: _unknown, ...query } = to.query
  return navigateTo({
    path: to.path,
    query: to.query.liked === undefined ? { ...query, ...profileQuery(profile) } : { user: profile.id, ...query },
    hash: to.hash
  }, { replace: true })
})

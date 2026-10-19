import type { Language, Profile } from '#shared/types'

// Who is viewing is part of the URL (`?user=sam&liked=…`); the cookie only remembers the last viewer for a bare `/`
export async function useProfiles() {
  const route = useRoute()
  const router = useRouter()
  const { locales } = useI18n()
  const localePath = useLocalePath()
  const remembered = useProfileCookie()
  const { data: profiles } = await useProfileList()

  const active = computed(() => findProfile(profiles.value, route.query.user) ?? profiles.value[0]!)

  // Languages are only stored for now; one without a registered locale file resolves to English
  const supported = computed<string[]>(() => locales.value.map(locale => typeof locale === 'string' ? locale : locale.code))
  const locale = computed<Language>(() => supported.value.includes(active.value.language) ? active.value.language : 'en')

  // One navigation replaces the whole query, so nothing from the previous viewer survives
  async function switchTo(id: string) {
    const profile = findProfile(profiles.value, id)
    if (!profile || profile.id === active.value.id) return
    remembered.value = profile.id
    await router.push({ path: localePath('/'), query: profileQuery(profile) })
    window.scrollTo(0, 0)
  }

  function resetLikes() {
    return router.replace({ query: { ...route.query, ...profileQuery(active.value) } })
  }

  return { profiles, active, locale, switchTo, resetLikes }
}

// The four demo profiles, fetched once and shared by key
export function useProfileList() {
  return useFetch<Profile[]>('/api/profiles', { key: 'profiles', default: () => [] })
}

export function useProfileCookie() {
  return useCookie<string | null>('profile', { default: () => null, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 })
}

export function findProfile(profiles: Profile[], id: unknown) {
  return typeof id === 'string' ? profiles.find(profile => profile.id === id) : undefined
}

// An empty `liked` is left out of the URL like everywhere else, which means "no picks"
export function profileQuery(profile: Profile) {
  return profile.liked.length ? { user: profile.id, liked: profile.liked.join(',') } : { user: profile.id }
}

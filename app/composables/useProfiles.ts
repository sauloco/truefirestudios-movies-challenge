import type { Language, Profile } from '#shared/types'

// Who is viewing is kept in localStorage (see useViewer); the first profile is the default
export async function useProfiles() {
  const { locales } = useI18n()
  const { state, update } = useViewer()
  const loading = useProfileLoading()
  const { data: profiles } = await useProfileList()

  const active = computed(() => findProfile(profiles.value, state.value.user) ?? profiles.value[0]!)

  // Languages are only stored for now; one without a registered locale file resolves to English
  const supported = computed<string[]>(() => locales.value.map(locale => typeof locale === 'string' ? locale : locale.code))
  const locale = computed<Language>(() => supported.value.includes(active.value.language) ? active.value.language : 'en')

  async function switchTo(id: string) {
    const profile = findProfile(profiles.value, id)
    if (!profile || profile.id === active.value.id) return
    loading.show(profile)
    update({ user: profile.id })
    window.scrollTo(0, 0)
  }

  function resetLikes() {
    const { [active.value.id]: _edited, ...picks } = state.value.picks
    update({ picks })
  }

  return { profiles, active, locale, switchTo, resetLikes }
}

// The four demo profiles, fetched once and shared by key
export function useProfileList() {
  return useFetch<Profile[]>('/api/profiles', { key: 'profiles', default: () => [] })
}

export function findProfile(profiles: Profile[], id: unknown) {
  return typeof id === 'string' ? profiles.find(profile => profile.id === id) : undefined
}

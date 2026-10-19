import type { Language, Profile } from '#shared/types'

// Who is viewing is kept in localStorage (see useViewer); the first profile is the default
export async function useProfiles() {
  const { locales, setLocale } = useI18n()
  const { state, update } = useViewer()
  const loading = useProfileLoading()
  const { data: profiles } = await useProfileList()

  const active = computed(() => findProfile(profiles.value, state.value.user) ?? profiles.value[0]!)

  // A viewer's own choice wins over their profile's language; one without a registered locale file resolves to English
  const supported = computed<string[]>(() => locales.value.map(locale => typeof locale === 'string' ? locale : locale.code))
  const languageOf = (profile: Profile) => {
    const chosen = state.value.languages[profile.id] ?? profile.language
    return (supported.value.includes(chosen) ? chosen : 'en') as Language
  }
  const locale = computed(() => languageOf(active.value))

  async function switchTo(id: string) {
    const profile = findProfile(profiles.value, id)
    if (!profile || profile.id === active.value.id) return
    loading.show(profile)
    update({ user: profile.id })
    await setLocale(languageOf(profile))
    window.scrollTo(0, 0)
  }

  // Picking a language in the header makes it that viewer's language from then on
  async function setLanguage(code: Language) {
    update({ languages: { ...state.value.languages, [active.value.id]: code } })
    await setLocale(code)
  }

  function resetLikes() {
    const { [active.value.id]: _edited, ...picks } = state.value.picks
    update({ picks })
  }

  return { profiles, active, locale, languageOf, switchTo, setLanguage, resetLikes }
}

// The four demo profiles, fetched once and shared by key
export function useProfileList() {
  return useFetch<Profile[]>('/api/profiles', { key: 'profiles', default: () => [] })
}

export function findProfile(profiles: Profile[], id: unknown) {
  return typeof id === 'string' ? profiles.find(profile => profile.id === id) : undefined
}

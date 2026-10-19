// The watchlist never leaves the browser: ids sit in localStorage, one list per demo viewer
const STORAGE_PREFIX = 'watchlist:'

function read(key: string): number[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((id): id is number => Number.isInteger(id)) : []
  }
  catch {
    return []
  }
}

// Synchronous so any card can use it. The lists are read after mount, which keeps the server HTML and the
// first client render identical (an empty watchlist) instead of mismatching
export function useWatchlist() {
  const route = useRoute()
  const { data: profiles } = useProfileList()
  const lists = useState<Record<string, number[]>>('watchlists', () => ({}))

  const profileId = computed(() => findProfile(profiles.value, route.query.user)?.id ?? profiles.value[0]?.id ?? 'guest')
  const ids = computed(() => lists.value[profileId.value] ?? [])

  function load(id: string) {
    if (!import.meta.client || id in lists.value) return
    lists.value = { ...lists.value, [id]: read(STORAGE_PREFIX + id) }
  }

  onMounted(() => load(profileId.value))
  watch(profileId, id => load(id))

  const has = (movieId: number) => ids.value.includes(movieId)

  function toggle(movieId: number) {
    load(profileId.value)
    const next = has(movieId) ? ids.value.filter(id => id !== movieId) : [...ids.value, movieId]
    lists.value = { ...lists.value, [profileId.value]: next }
    try {
      localStorage.setItem(STORAGE_PREFIX + profileId.value, JSON.stringify(next))
    }
    catch {
      // Storage can be blocked or full; the list still works for this visit
    }
  }

  return { ids, has, toggle }
}

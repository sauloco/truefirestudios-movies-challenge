// Without edits a viewer shows the likes of their profile; edits are kept per viewer in localStorage (see useViewer)
export async function useLikedMovies() {
  // Every composable starts before the first await, while the setup context still exists
  const moviesRequest = useMovies()
  const profilesRequest = useProfiles()
  const { state, update } = useViewer()
  const analytics = useAnalytics()
  const { data: movies } = await moviesRequest
  const { active } = await profilesRequest

  const byId = computed(() => new Map(movies.value.map(movie => [movie.id, movie])))

  // Ids that are not in the catalog are dropped rather than failing the page
  const liked = computed(() => [...new Set(state.value.picks[active.value.id] ?? active.value.liked)].filter(id => byId.value.has(id)))

  const likedMovies = computed(() => liked.value.map(id => byId.value.get(id)!))
  const available = computed(() => movies.value.filter(movie => !liked.value.includes(movie.id)))

  function setLiked(ids: number[]) {
    update({ picks: { ...state.value.picks, [active.value.id]: ids } })
  }

  function add(id: number) {
    if (liked.value.includes(id)) return
    analytics.moviePicked(id, liked.value.length + 1)
    return setLiked([...liked.value, id])
  }

  function remove(id: number) {
    if (!liked.value.includes(id)) return
    analytics.movieRemoved(id, liked.value.length - 1)
    return setLiked(liked.value.filter(pick => pick !== id))
  }

  return { liked, likedMovies, available, add, remove }
}

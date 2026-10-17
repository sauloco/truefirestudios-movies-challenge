// The picks live in the URL (`?liked=20,59,60`) so results can be shared and survive a refresh
export async function useLikedMovies() {
  const route = useRoute()
  const router = useRouter()
  const { data: movies } = await useMovies()
  const analytics = useAnalytics()

  const byId = computed(() => new Map(movies.value.map(movie => [movie.id, movie])))

  const requested = computed(() => {
    const raw = [route.query.liked].flat().filter(value => typeof value === 'string')
    return raw.flatMap(value => value.split(',')).map(value => value.trim()).filter(Boolean)
  })

  // Ids that are not numbers or not in the catalog are dropped rather than failing the page
  const validIds = computed(() => requested.value.map(Number).filter(id => byId.value.has(id)))
  const liked = computed(() => [...new Set(validIds.value)])

  const likedMovies = computed(() => liked.value.map(id => byId.value.get(id)!))
  const available = computed(() => movies.value.filter(movie => !liked.value.includes(movie.id)))
  const ignoredCount = computed(() => requested.value.length - validIds.value.length)

  function setLiked(ids: number[]) {
    const { liked: _previous, ...query } = route.query
    return router.replace({ query: ids.length ? { ...query, liked: ids.join(',') } : query })
  }

  function add(id: number) {
    if (liked.value.includes(id)) return
    analytics.moviePicked(id, liked.value.length + 1)
    return setLiked([...liked.value, id])
  }

  function remove(id: number) {
    analytics.movieRemoved(id, liked.value.length - 1)
    return setLiked(liked.value.filter(pick => pick !== id))
  }

  return { liked, likedMovies, available, ignoredCount, add, remove }
}

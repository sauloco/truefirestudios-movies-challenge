import type { Profile } from '#shared/types'

// Restores the stored viewer once hydration is over: changing state while Vue hydrates leaves stale classes and
// attributes behind, because it only repairs text. A link from before picks left the URL (`?user=sam&liked=5,9`)
// is imported once and then cleaned up, so old shared links keep working.
// `data-viewer-ready` marks the moment the stored viewer is on screen.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', () => nuxtApp.runWithContext(async () => {
    if (nuxtApp.isHydrating) await new Promise(resolve => nuxtApp.hooks.hookOnce('app:suspense:resolve', resolve))
    const router = useRouter()
    const { state, update } = useViewer()
    // Already fetched by the page; reading the cache avoids a `useFetch` after mount
    const { data: profiles } = useNuxtData<Profile[]>('profiles')
    state.value = readViewer()

    const { user, liked, ...rest } = router.currentRoute.value.query
    if (user !== undefined || liked !== undefined) {
      const profile = findProfile(profiles.value ?? [], user) ?? findProfile(profiles.value ?? [], state.value.user) ?? profiles.value?.[0]
      if (profile) {
        const ids = typeof liked === 'string' ? liked.split(',').filter(Boolean).map(Number).filter(Number.isInteger) : undefined
        update({ user: profile.id, picks: ids ? { ...state.value.picks, [profile.id]: ids } : state.value.picks })
      }
      await router.replace({ query: rest })
    }

    const current = findProfile(profiles.value ?? [], state.value.user) ?? profiles.value?.[0]
    if (current) {
      const loading = useProfileLoading()
      loading.target(current)
      // Only the home room reports its results ready; any other page (a movie opened directly) has nothing to wait for
      if (useRouteBaseName()(router.currentRoute.value) !== 'index') loading.markReady(current.id)
    }

    await nextTick()
    document.documentElement.dataset.viewerReady = ''
  }))
})

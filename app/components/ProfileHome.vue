<script setup lang="ts">
// Everything with local state (menus, the debounced picks, request status) lives here so that
// the page can remount it with a key when the viewer changes, instead of carrying state over from the previous one
const { active } = await useProfiles()
const { liked, likedMovies, remove } = await useLikedMovies()
const { data: movies } = await useMovies()
const { data, status, error, refresh, settled } = await useRecommendations(liked)
const watchlist = useWatchlist()
const loading = useProfileLoading()

// The overlay lifts once this viewer's room has its results (or has failed to get them)
if (import.meta.client) {
  watch(status, async (current) => {
    if (current === 'pending') return
    await nextTick()
    loading.markReady(active.value.id)
  }, { immediate: true })
}

const analytics = useAnalytics()
// Once per result set shown, including the one rendered on the server for a deep link. Nothing is reported
// while the viewer is still the placeholder one from the server render (the stored viewer replaces it right
// after mount) or while the response on screen is for picks that are no longer the viewer's
let reported = ''
watch([data, status, () => loading.state.value.targetId, liked, settled], ([shown, current, target, picks, asked]) => {
  if (current !== 'success' || !shown?.items.length || target !== active.value.id) return
  if (picks.join(',') !== asked.join(',')) return
  const signature = `${asked.join(',')}|${shown.source}`
  if (signature === reported) return
  reported = signature
  analytics.recommendationsShown(asked.length, shown.source)
}, { immediate: true })

const watchlisted = computed(() => {
  const byId = new Map(movies.value.map(movie => [movie.id, movie]))
  return watchlist.ids.value.flatMap(id => byId.get(id) ?? [])
})
</script>

<template>
  <div>
    <h1 class="sr-only">
      {{ $t('app.title') }}
    </h1>

    <RoomScene
      :tint="active.tint"
      :pattern="active.pattern"
    >
      <template #recs>
        <RecommendationGrid
          :recommendations="data"
          :pending="status === 'pending'"
          :failed="!!error"
          @retry="refresh()"
        />
      </template>

      <template #likes>
        <h2 class="room-heading">
          {{ $t('liked.heading') }}
        </h2>
        <p
          v-if="!likedMovies.length"
          class="room-note"
        >
          {{ $t('liked.hint') }}
        </p>
        <div
          class="room-tiles"
          data-testid="liked-wall"
        >
          <WallPoster
            v-for="movie in likedMovies"
            :key="movie.id"
            kind="liked"
            :movie="movie"
            @remove="remove(movie.id)"
          />
        </div>
      </template>

      <template #watch>
        <h2 class="room-heading">
          {{ $t('watchlist.heading') }}
        </h2>
        <p
          v-if="!watchlisted.length"
          class="room-note"
          data-testid="watchlist-empty"
        >
          {{ $t('watchlist.empty') }}
        </p>
        <div class="room-tiles">
          <WallPoster
            v-for="movie in watchlisted"
            :key="movie.id"
            kind="watchlist"
            :movie="movie"
          />
        </div>
      </template>

      <template #egg="{ front }">
        <RoomEggWall :front="front" />
      </template>
    </RoomScene>
  </div>
</template>

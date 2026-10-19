<script setup lang="ts">
// Everything with local state (menus, the debounced picks, request status) lives here so that
// the page can remount it with a key when the viewer changes, instead of carrying state over from the previous one
const { active, resetLikes } = await useProfiles()
const { liked, likedMovies, ignoredCount, remove } = await useLikedMovies()
const { data: movies } = await useMovies()
const { data, status, error, refresh } = await useRecommendations(liked)
const watchlist = useWatchlist()

const analytics = useAnalytics()
// Once per result set shown, including the one rendered on the server for a deep link
watch(data, (shown) => {
  if (shown?.items.length) analytics.recommendationsShown(liked.value.length, shown.source)
}, { immediate: true })

const edited = computed(() => liked.value.length !== active.value.liked.length
  || liked.value.some(id => !active.value.liked.includes(id)))

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

    <div
      v-if="edited || ignoredCount"
      class="room-notices"
    >
      <v-btn
        v-if="edited"
        size="small"
        variant="tonal"
        data-testid="reset-likes"
        @click="resetLikes()"
      >
        {{ $t('profiles.reset') }}
      </v-btn>
      <v-alert
        v-if="ignoredCount"
        type="warning"
        variant="tonal"
        density="compact"
        :text="$t('liked.ignored')"
        data-testid="ignored-ids-notice"
      />
    </div>

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

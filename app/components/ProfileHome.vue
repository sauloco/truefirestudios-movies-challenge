<script setup lang="ts">
// Everything with local state (search text, menus, the debounced picks, request status) lives here so that
// the page can remount it with a key when the viewer changes, instead of carrying state over from the previous one
const { active, resetLikes } = await useProfiles()
const { liked, likedMovies, available, ignoredCount, add, remove } = await useLikedMovies()
const { data, status, error, refresh } = await useRecommendations(liked)

const analytics = useAnalytics()
// Once per result set shown, including the one rendered on the server for a deep link
watch(data, (shown) => {
  if (shown?.items.length) analytics.recommendationsShown(liked.value.length, shown.source)
}, { immediate: true })

const edited = computed(() => liked.value.length !== active.value.liked.length
  || liked.value.some(id => !active.value.liked.includes(id)))
</script>

<template>
  <div class="d-flex flex-column ga-6">
    <section>
      <h1 class="text-h5 mb-3">
        {{ $t('liked.heading') }}
      </h1>
      <MovieSearch
        :movies="available"
        @select="add"
      />
      <LikedChips
        class="mt-3"
        :movies="likedMovies"
        @remove="remove"
      />
      <div class="d-flex flex-wrap align-center ga-2 mt-2">
        <p
          v-if="!liked.length"
          class="text-body-2 text-medium-emphasis"
        >
          {{ $t('liked.hint') }}
        </p>
        <v-btn
          v-if="edited"
          size="small"
          variant="tonal"
          data-testid="reset-likes"
          @click="resetLikes()"
        >
          {{ $t('profiles.reset') }}
        </v-btn>
      </div>
      <v-alert
        v-if="ignoredCount"
        class="mt-2"
        type="warning"
        variant="tonal"
        density="compact"
        :text="$t('liked.ignored')"
        data-testid="ignored-ids-notice"
      />
    </section>

    <RecommendationGrid
      :recommendations="data"
      :pending="status === 'pending'"
      :failed="!!error"
      @retry="refresh()"
    />
  </div>
</template>

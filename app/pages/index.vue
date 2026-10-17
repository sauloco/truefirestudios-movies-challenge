<script setup lang="ts">
const { liked, likedMovies, available, ignoredCount, add, remove } = await useLikedMovies()
const { data, status, error, refresh } = await useRecommendations(liked)
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
      <p
        v-if="!liked.length"
        class="text-body-2 text-medium-emphasis mt-2"
      >
        {{ $t('liked.hint') }}
      </p>
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

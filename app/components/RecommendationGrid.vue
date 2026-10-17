<script setup lang="ts">
import type { RecommendationsResponse } from '#shared/types'

const SKELETON_COUNT = 6

defineProps<{
  recommendations: RecommendationsResponse | null | undefined
  pending: boolean
  failed: boolean
}>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <section
    aria-live="polite"
    :aria-busy="pending"
    data-testid="recommendations"
  >
    <h2
      v-if="recommendations"
      class="text-h6 mb-3"
      data-testid="recommendations-heading"
    >
      {{ $t(recommendations.source === 'popular' ? 'recommendations.headingPopular' : 'recommendations.headingPersonalized') }}
    </h2>

    <v-row
      v-if="pending && !recommendations"
      data-testid="recommendation-loading"
    >
      <v-col
        v-for="index in SKELETON_COUNT"
        :key="index"
        cols="6"
        sm="4"
        md="3"
        lg="2"
      >
        <v-skeleton-loader
          type="image, article"
          data-testid="recommendation-skeleton"
        />
      </v-col>
    </v-row>

    <RecommendationError
      v-else-if="failed"
      @retry="$emit('retry')"
    />

    <RecommendationEmpty v-else-if="recommendations && !recommendations.items.length" />

    <v-row
      v-else-if="recommendations"
      data-testid="recommendation-grid"
    >
      <v-col
        v-for="item in recommendations.items"
        :key="item.movie.id"
        cols="6"
        sm="4"
        md="3"
        lg="2"
      >
        <MovieCard
          :item="item"
          :source="recommendations.source"
        />
      </v-col>
    </v-row>
  </section>
</template>

<script setup lang="ts">
import type { Recommendation, RecommendationsResponse } from '#shared/types'

const SKELETON_COUNT = 6

const props = defineProps<{
  recommendations: RecommendationsResponse | null | undefined
  pending: boolean
  failed: boolean
}>()
defineEmits<{ retry: [] }>()

const { t, n, locale } = useI18n()
const analytics = useAnalytics()

// Joins the titles the way the locale does ("A, B, and C" / "A, B y C" / "A、B、C")
const titles = computed(() => new Intl.ListFormat(locale.value, { style: 'long', type: 'conjunction' }))

const reason = (item: Recommendation) => item.because.length
  ? t('recommendations.because', { titles: titles.value.format(item.because.map(({ title }) => title)) })
  : t('recommendations.popularReason')

const score = (item: Recommendation) => t(
  props.recommendations?.source === 'personalized' ? 'recommendations.matchScore' : 'recommendations.popularityScore',
  { percent: n(Math.round(item.score * 100)) }
)
</script>

<template>
  <section
    aria-live="polite"
    :aria-busy="pending"
    data-testid="recommendations"
  >
    <h2
      v-if="recommendations"
      class="room-heading"
      data-testid="recommendations-heading"
    >
      {{ $t(recommendations.source === 'popular' ? 'recommendations.headingPopular' : 'recommendations.headingPersonalized') }}
    </h2>

    <div
      v-if="pending && !recommendations"
      class="room-tiles"
      data-testid="recommendation-loading"
    >
      <v-skeleton-loader
        v-for="index in SKELETON_COUNT"
        :key="index"
        type="image"
        data-testid="recommendation-skeleton"
      />
    </div>

    <RecommendationError
      v-else-if="failed"
      @retry="$emit('retry')"
    />

    <RecommendationEmpty v-else-if="recommendations && !recommendations.items.length" />

    <div
      v-else-if="recommendations"
      class="room-tiles"
      data-testid="recommendation-grid"
    >
      <WallPoster
        v-for="item in recommendations.items"
        :key="item.movie.id"
        kind="recommendation"
        :movie="item.movie"
        :reason="reason(item)"
        :score="score(item)"
        @open="analytics.recommendationClicked(item.movie.id, recommendations.source)"
      />
    </div>
  </section>
</template>

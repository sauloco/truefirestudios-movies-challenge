<script setup lang="ts">
import type { Recommendation } from '#shared/types'

const props = defineProps<{
  item: Recommendation
  source: 'personalized' | 'popular'
}>()

const { t, n } = useI18n()
const route = useRoute()
// The detail page shows the score only when it was reached from a card
const arrival = useState<{ id: number, score: string } | null>('movie-arrival', () => null)

const reason = computed(() => props.item.because.length
  ? t('recommendations.because', { titles: props.item.because.map(({ title }) => title).join(', ') })
  : t('recommendations.popularReason'))

const score = computed(() => {
  const percent = n(Math.round(props.item.score * 100))
  return t(props.source === 'personalized' ? 'recommendations.matchScore' : 'recommendations.popularityScore', { percent })
})

const to = computed(() => ({ path: `/movies/${props.item.movie.id}`, query: route.query }))
</script>

<template>
  <v-card
    class="h-100"
    :to="to"
    data-testid="movie-card"
    :data-movie-id="item.movie.id"
    @click="arrival = { id: item.movie.id, score }"
  >
    <PosterImage
      :src="item.movie.posterUrl"
      :blurhash="item.movie.blurhash"
      :title="item.movie.title"
      :style="{ viewTransitionName: `movie-poster-${item.movie.id}`, viewTransitionClass: 'poster' }"
    />
    <v-card-item>
      <v-card-title
        class="movie-title"
        data-testid="movie-card-title"
      >
        <span
          class="vt-fit"
          :style="{ viewTransitionName: `movie-title-${item.movie.id}`, viewTransitionClass: 'title' }"
        >{{ item.movie.title }}</span>
      </v-card-title>
      <v-card-subtitle data-testid="movie-card-year">
        {{ item.movie.year }}
      </v-card-subtitle>
    </v-card-item>
    <v-card-text class="pt-0">
      <p
        class="text-body-2"
        data-testid="movie-card-reason"
      >
        {{ reason }}
      </p>
      <v-chip
        class="mt-2"
        size="small"
        color="primary"
        data-testid="movie-card-score"
      >
        {{ score }}
      </v-chip>
    </v-card-text>
  </v-card>
</template>

<style scoped>
/* Titles wrap at word boundaries; only an unbreakable overlong word is split */
.movie-title {
  white-space: normal;
  word-break: normal;
  overflow-wrap: break-word;
  hyphens: auto;
}
</style>

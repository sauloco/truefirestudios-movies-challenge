<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const { t } = useI18n()
const { data: movies } = await useMovies()
const arrival = useState<{ id: number, score: string } | null>('movie-arrival', () => null)

const movie = computed(() => {
  const id = String(route.params.id)
  return /^\d+$/.test(id) ? movies.value.find(candidate => candidate.id === Number(id)) : undefined
})

if (!movie.value) {
  throw createError({ statusCode: 404, statusMessage: t('detail.notFound'), fatal: true })
}

const score = computed(() => arrival.value && arrival.value.id === movie.value?.id ? arrival.value.score : null)

useHead({ title: () => movie.value?.title })

// With app history Back restores the grid exactly; a direct visit has none, so the link goes home
function goBack(event: MouseEvent) {
  if (!window.history.state?.back) return
  event.preventDefault()
  router.back()
}
</script>

<template>
  <article
    v-if="movie"
    data-testid="movie-detail"
  >
    <NuxtLink
      :to="localePath('/')"
      class="d-inline-flex align-center mb-4 text-body-2"
      data-testid="detail-back"
      @click="goBack"
    >
      <span
        class="mr-1"
        aria-hidden="true"
      >←</span>
      {{ $t('detail.back') }}
    </NuxtLink>

    <header
      class="hero rounded-lg pa-4 pa-sm-6 d-flex flex-column flex-sm-row ga-4 ga-sm-6 align-sm-end"
      data-testid="detail-hero"
    >
      <div
        v-if="movie.posterUrl"
        class="hero__backdrop"
        :style="{ backgroundImage: `url(${movie.posterUrl})` }"
        aria-hidden="true"
        data-testid="detail-backdrop"
      />
      <PosterImage
        class="hero__poster"
        :src="movie.posterUrl"
        :blurhash="movie.blurhash"
        :title="movie.title"
        eager
        :style="{ viewTransitionName: `movie-poster-${movie.id}`, viewTransitionClass: 'poster' }"
      />
      <div class="hero__text">
        <h1
          class="text-h4 text-wrap vt-fit"
          :style="{ viewTransitionName: `movie-title-${movie.id}`, viewTransitionClass: 'title' }"
          data-testid="detail-title"
        >
          {{ movie.title }}
        </h1>
        <p
          class="text-subtitle-1 mt-1"
          data-testid="detail-year"
        >
          {{ movie.year }}
        </p>
        <WatchlistButton
          class="mt-4"
          :movie="movie"
        />
        <div
          class="d-flex flex-wrap ga-2 mt-3"
          role="list"
          :aria-label="$t('detail.genres')"
        >
          <v-chip
            v-for="genre in movie.genres"
            :key="genre"
            size="small"
            role="listitem"
            data-testid="detail-genre"
          >
            {{ genre }}
          </v-chip>
          <v-chip
            v-if="score"
            size="small"
            color="primary"
            variant="flat"
            data-testid="detail-score"
          >
            {{ score }}
          </v-chip>
        </div>
      </div>
    </header>

    <p
      class="text-body-1 mt-6"
      data-testid="detail-overview"
    >
      {{ movie.overview }}
    </p>
  </article>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  background: rgb(var(--v-theme-surface-variant));
}

.hero__backdrop {
  position: absolute;
  inset: -24px;
  z-index: -1;
  background-size: cover;
  background-position: center;
  filter: blur(24px) brightness(0.55);
}

.hero__poster {
  flex: none;
  width: min(220px, 60%);
}

.hero__text {
  color: #fff;
  min-width: 0;
}
</style>

<script setup lang="ts">
import { mdiBookmark, mdiBookmarkOutline, mdiClose } from '@mdi/js'
import type { Movie } from '#shared/types'

const props = defineProps<{
  movie: Movie
  kind: 'recommendation' | 'liked' | 'watchlist'
  reason?: string
  score?: string
}>()
const emit = defineEmits<{ open: [], remove: [] }>()

const route = useRoute()
const router = useRouter()
const { has, toggle } = useWatchlist()

// The detail page shows the score only when it was reached from a recommendation
const arrival = useState<{ id: number, score: string } | null>('movie-arrival', () => null)
// A movie can hang on two walls at once and a transition name must be unique, so only the poster that was clicked has one
const focus = useState<string | null>('room-focus', () => null)

const key = computed(() => `${props.kind}:${props.movie.id}`)
const to = computed(() => ({ path: `/movies/${props.movie.id}`, query: route.query }))
// A plain anchor rather than NuxtLink: the click may have to wait for the camera before navigating
const href = computed(() => router.resolve(to.value).href)
const listed = computed(() => has(props.movie.id))
const testid = computed(() => ({ recommendation: 'movie-card', liked: 'liked-chip', watchlist: 'watchlist-item' })[props.kind])

async function open(event: MouseEvent) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  arrival.value = props.kind === 'recommendation' && props.score ? { id: props.movie.id, score: props.score } : null
  emit('open')
  focus.value = key.value
  // The name has to be on the page before the navigation starts the view transition
  await nextTick()
  await router.push(to.value)
}
</script>

<template>
  <div
    class="tile"
    :data-testid="testid"
    :data-movie-id="movie.id"
  >
    <a
      class="tile__link"
      :href="href"
      @click="open"
    >
      <PosterImage
        :src="movie.posterUrl"
        :blurhash="movie.blurhash"
        :title="movie.title"
        :style="focus === key ? { viewTransitionName: `movie-poster-${movie.id}`, viewTransitionClass: 'poster' } : undefined"
      />
      <span
        v-if="kind === 'recommendation'"
        class="tile__caption"
      >
        <span
          class="tile__title"
          data-testid="movie-card-title"
        >{{ movie.title }}</span>
        <span
          class="tile__year"
          data-testid="movie-card-year"
        >{{ movie.year }}</span>
        <span
          class="tile__reason"
          data-testid="movie-card-reason"
        >{{ reason }}</span>
      </span>
      <span
        v-else
        class="tile__caption"
      >
        <span class="tile__title">{{ movie.title }} ({{ movie.year }})</span>
      </span>
    </a>
    <span
      v-if="kind === 'recommendation' && score"
      class="tile__score"
      data-testid="movie-card-score"
    >{{ score }}</span>
    <div class="tile__actions">
      <button
        type="button"
        class="tile__button"
        :class="{ 'tile__button--on': listed }"
        :aria-pressed="listed"
        :aria-label="listed ? $t('watchlist.remove', { title: movie.title }) : $t('watchlist.add', { title: movie.title })"
        data-testid="watchlist-toggle"
        @click="toggle(movie.id)"
      >
        <v-icon
          :icon="`svg:${listed ? mdiBookmark : mdiBookmarkOutline}`"
          size="16"
        />
      </button>
      <button
        v-if="kind === 'liked'"
        type="button"
        class="tile__button"
        :aria-label="$t('liked.remove', { title: movie.title })"
        data-testid="liked-remove"
        @click="emit('remove')"
      >
        <v-icon
          :icon="`svg:${mdiClose}`"
          size="16"
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
/* A printed poster pinned to the wall: paper margin, gloss, grain, a layered shadow and a pin */
.tile {
  position: relative;
  min-width: 0;
}

.tile__link {
  position: relative;
  display: block;
  overflow: hidden;
  color: #fff;
  text-decoration: none;
  border: 5px solid #f4f1ea;
  border-bottom-width: 7px;
  border-radius: 2px;
  background: #f4f1ea;
  box-shadow:
    0 1px 1px rgb(14 21 46 / 0.35),
    0 4px 7px rgb(14 21 46 / 0.28),
    0 14px 22px -6px rgb(14 21 46 / 0.38),
    inset 0 0 0 1px rgb(0 0 0 / 0.18);
  transition: box-shadow 0.25s;
}

.tile__link::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  mix-blend-mode: soft-light;
  background:
    linear-gradient(115deg, rgb(255 255 255 / 0.55) 0, rgb(255 255 255 / 0) 38%, rgb(255 255 255 / 0) 62%, rgb(255 255 255 / 0.22) 100%),
    repeating-linear-gradient(0deg, rgb(0 0 0 / 0.05) 0 1px, transparent 1px 3px);
}

.tile__link::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 50%;
  z-index: 3;
  width: 9px;
  height: 9px;
  margin-inline-start: -4.5px;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(circle at 35% 30%, #fff 0 12%, #d33 14% 60%, #7a1010 100%);
  box-shadow: 1px 2px 2px rgb(0 0 0 / 0.5);
}

/* Hover and focus backlight the poster: a glow only, nothing moves or resizes */
.tile__link:hover,
.tile__link:focus-visible {
  outline: none;
  box-shadow:
    0 1px 1px rgb(14 21 46 / 0.35),
    0 0 0 1px rgb(255 255 255 / 0.5),
    0 0 14px 3px rgb(255 244 214 / 0.75),
    0 0 38px 10px rgb(255 226 160 / 0.45),
    inset 0 0 0 1px rgb(0 0 0 / 0.18);
}

.tile__link:focus-visible {
  outline: 3px solid rgb(var(--v-theme-accent));
  outline-offset: 3px;
}

.tile__caption {
  position: absolute;
  inset: auto 0 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 22px 6px 6px;
  background: linear-gradient(transparent, rgb(0 0 0 / 0.82));
  font-size: 0.68rem;
  line-height: 1.25;
  opacity: 0;
  transition: opacity 0.2s;
}

.tile:hover .tile__caption,
.tile:focus-within .tile__caption {
  opacity: 1;
}

/* No hover on touch: keep the title on the poster */
@media (hover: none) {
  .tile__caption {
    opacity: 1;
  }

  .tile__reason {
    display: none;
  }
}

.tile__title {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.tile__year,
.tile__reason {
  opacity: 0.85;
}

.tile__score {
  position: absolute;
  top: 16px;
  left: 7px;
  z-index: 4;
  padding: 1px 7px;
  border-radius: 99px;
  background: #0e152e;
  color: #fff;
  font-size: 0.62rem;
  font-weight: 700;
  pointer-events: none;
}

.tile__actions {
  position: absolute;
  top: 14px;
  right: 6px;
  z-index: 4;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tile__button {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 50%;
  background: rgb(14 21 46 / 0.85);
  color: #fff;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.tile:hover .tile__button,
.tile:focus-within .tile__button,
.tile__button--on {
  opacity: 1;
}

@media (hover: none) {
  .tile__button {
    opacity: 1;
  }
}

.tile__button:focus-visible {
  outline: 2px solid rgb(var(--v-theme-accent));
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .tile__link,
  .tile__caption,
  .tile__button {
    transition: none;
  }
}
</style>

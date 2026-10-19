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
// Taking a poster off the wall peels it from the top (the Vue Bits StickerPeel flap, in CSS), then runs the real removal
const peeling = ref(false)
const peelStyle = ref<Record<string, string | number>>({})
const tile = useTemplateRef<HTMLElement>('tile')
let afterPeel: (() => void) | null = null
const testid = computed(() => ({ recommendation: 'movie-card', liked: 'liked-chip', watchlist: 'watchlist-item' })[props.kind])

// The peel starts at a random corner and sweeps diagonally. The flap is the peeled part mirrored across the moving fold line
function randomCorner() {
  const sx = Math.random() < 0.5 ? 1 : -1
  const sy = Math.random() < 0.5 ? 1 : -1
  const width = tile.value?.offsetWidth ?? 0
  const height = tile.value?.offsetHeight ?? 0
  const s = Math.SQRT1_2
  const dx = sx * s
  const dy = sy * s
  const corner = (sx > 0 ? 0 : width) * dx + (sy > 0 ? 0 : height) * dy
  const span = s * (width + height)
  return {
    '--peel-angle': `${sx > 0 ? (sy > 0 ? 135 : 45) : (sy > 0 ? 225 : 315)}deg`,
    '--flip-a': 1 - 2 * dx * dx,
    '--flip-b': -2 * dx * dy,
    '--flip-d': 1 - 2 * dy * dy,
    '--flip-e0': 2 * corner * dx,
    '--flip-f0': 2 * corner * dy,
    '--flip-e1': 2 * span * dx,
    '--flip-f1': 2 * span * dy
  }
}

function peelOff(action: () => void) {
  if (peeling.value) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return action()
  afterPeel = action
  peelStyle.value = randomCorner()
  peeling.value = true
}

function peeled(event: AnimationEvent) {
  if (event.target !== event.currentTarget || !afterPeel) return
  const action = afterPeel
  afterPeel = null
  action()
}

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
    ref="tile"
    class="tile"
    :class="{ 'tile--peeling': peeling }"
    :style="peeling ? peelStyle : undefined"
    :data-testid="testid"
    :data-movie-id="movie.id"
    @animationend="peeled"
  >
    <span
      v-if="peeling"
      class="tile__flap"
      aria-hidden="true"
    />
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
        @click="kind === 'watchlist' ? peelOff(() => toggle(movie.id)) : toggle(movie.id)"
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
        @click="peelOff(() => emit('remove'))"
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
@property --peel {
  syntax: '<number>';
  inherits: true;
  initial-value: 0;
}

/* A printed poster pinned to the wall: paper margin, gloss, grain, and a layered shadow */
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

/* The poster is masked away along a diagonal fold while the peeled part shows as the back of the paper */
.tile--peeling {
  pointer-events: none;
  animation: tile-peel 0.7s cubic-bezier(0.55, 0, 0.6, 1) forwards;
}

.tile--peeling .tile__link {
  -webkit-mask-image: linear-gradient(var(--peel-angle), transparent calc(var(--peel) * 100%), #000 calc(var(--peel) * 100%));
  mask-image: linear-gradient(var(--peel-angle), transparent calc(var(--peel) * 100%), #000 calc(var(--peel) * 100%));
}

.tile--peeling .tile__actions {
  display: none;
}

.tile__flap {
  position: absolute;
  inset: 0;
  z-index: 4;
  border-radius: 2px;
  background: linear-gradient(180deg, #cfcabd, #ece8de 60%, #d9d4c7);
  box-shadow: 0 6px 10px -2px rgb(14 21 46 / 0.45);
  transform-origin: 0 0;
  transform: matrix(var(--flip-a), var(--flip-b), var(--flip-b), var(--flip-d), calc(var(--flip-e0) + var(--peel) * var(--flip-e1)), calc(var(--flip-f0) + var(--peel) * var(--flip-f1)));
  -webkit-mask-image: linear-gradient(var(--peel-angle), #000 calc(var(--peel) * 100%), transparent calc(var(--peel) * 100%));
  mask-image: linear-gradient(var(--peel-angle), #000 calc(var(--peel) * 100%), transparent calc(var(--peel) * 100%));
}

@keyframes tile-peel {
  to {
    --peel: 1;
    opacity: 0;
  }
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

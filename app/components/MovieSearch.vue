<script setup lang="ts">
import { mdiBookmarkOutline } from '@mdi/js'
import type { Movie } from '#shared/types'

const props = defineProps<{ movies: Movie[] }>()
const emit = defineEmits<{ select: [id: number] }>()

const id = useId()
const listId = `${id}-list`
const optionId = (movieId: number) => `${id}-option-${movieId}`

const search = ref('')
const open = ref(false)
const active = ref(0)
const list = ref<HTMLElement>()

const label = (movie: Movie) => `${movie.title} (${movie.year})`

const results = computed(() => {
  const query = search.value.trim().toLowerCase()
  return query ? props.movies.filter(movie => label(movie).toLowerCase().includes(query)) : props.movies
})

// The product name shows until the visitor engages with the field
const showTitle = computed(() => !open.value && !search.value)

watch(results, () => {
  active.value = 0
})

watch(active, () => {
  nextTick(() => list.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }))
})

function close() {
  open.value = false
  search.value = ''
}

function pick(movie: Movie | undefined) {
  if (!movie) return
  emit('select', movie.id)
  search.value = ''
  active.value = 0
}

function onKeydown(event: KeyboardEvent) {
  const last = results.value.length - 1
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!open.value) {
      open.value = true
      return
    }
    const step = event.key === 'ArrowDown' ? 1 : -1
    active.value = last < 0 ? 0 : (active.value + step + last + 1) % (last + 1)
  }
  else if (event.key === 'Enter' && open.value && results.value.length) {
    event.preventDefault()
    pick(results.value[active.value])
  }
  else if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    close()
  }
}
</script>

<template>
  <div
    class="msearch"
    data-testid="movie-search"
  >
    <div class="msearch__field">
      <input
          :id="id"
        v-model="search"
        class="msearch__input"
        type="text"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        :placeholder="open ? $t('search.label') : ''"
        aria-autocomplete="list"
        :aria-expanded="open"
        :aria-controls="listId"
        :aria-activedescendant="open && results[active] ? optionId(results[active]!.id) : undefined"
        @focus="open = true"
        @input="open = true"
        @blur="close"
        @keydown="onKeydown"
      >
      <label
        v-show="showTitle"
        class="msearch__title"
        :for="id"
      >{{ $t('app.title') }}</label>
    </div>
    <!-- Teleported out of the header: its backdrop-filter would otherwise trap a fixed child inside the pill -->
    <Teleport to="body">
      <Transition name="msearch-backdrop">
        <div
          v-if="open"
          class="msearch__backdrop"
          aria-hidden="true"
          data-testid="search-backdrop"
        />
      </Transition>
    </Teleport>
    <!-- The panel clips to the rounded corners; the list inside does the scrolling, so its bar is clipped too -->
    <div
      v-if="open"
      class="msearch__panel"
      @mousedown.prevent
    >
      <ul
        :id="listId"
        ref="list"
        class="msearch__list"
        role="listbox"
        :aria-label="$t('search.label')"
      >
        <li
          v-for="(movie, index) in results"
          :id="optionId(movie.id)"
          :key="movie.id"
          class="msearch__option"
          :class="{ 'msearch__option--active': index === active }"
          role="option"
          :aria-selected="index === active"
          :data-testid="`movie-option-${movie.id}`"
          @mousemove="active = index"
          @click="pick(movie)"
        >
          <PosterImage
            class="msearch__poster"
            :src="movie.posterUrl"
            :blurhash="movie.blurhash"
            :title="movie.title"
          />
          <span class="msearch__text">
            <span class="msearch__name">{{ movie.title }}</span>
            <span class="msearch__meta">{{ [movie.year, ...movie.genres].join(' · ') }}</span>
          </span>
          <!-- Presentational: the whole row is the click target -->
          <span
            v-if="index === active"
            class="msearch__add"
            aria-hidden="true"
          >
            <v-icon
              :icon="`svg:${mdiBookmarkOutline}`"
              size="18"
            />
            {{ $t('search.add') }}
          </span>
        </li>
        <li
          v-if="!results.length"
          class="msearch__empty"
        >
          {{ $t('search.noData') }}
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* Not positioned itself: the results anchor to the header pill so they span its full width */
.msearch {
  inline-size: 100%;
}

.msearch__field {
  position: relative;
}

.msearch__input,
.msearch__title {
  font: inherit;
  font-size: 1.125rem;
  font-weight: 400;
  letter-spacing: -0.005em;
  line-height: 40px;
}

.msearch__input {
  display: block;
  inline-size: 100%;
  min-inline-size: 0;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: inherit;
  caret-color: rgb(var(--v-theme-primary));
}

.msearch__input::placeholder {
  color: rgb(var(--v-theme-on-surface), 0.5);
}

/* The title sits where the typed text will appear, so the header reads as one field becoming an input */
.msearch__title {
  position: absolute;
  inset: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: text;
}

.msearch__panel {
  position: absolute;
  inset-block-start: calc(100% + 10px);
  inset-inline: 0;
  z-index: 10;
  overflow: hidden;
  border-radius: 28px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-on-surface), 0.12);
  box-shadow: 0 10px 30px rgb(14 21 46 / 0.12);
}

.msearch__list {
  max-block-size: min(460px, 65dvh);
  margin: 0;
  padding: 8px 0;
  overflow-y: auto;
  list-style: none;
}

.msearch__option,
.msearch__empty {
  padding: 10px var(--header-pad, 28px);
  font-size: 1rem;
}

.msearch__option {
  display: flex;
  align-items: center;
  gap: 20px;
  cursor: pointer;
}

.msearch__add {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 6px;
  margin-inline-start: auto;
  padding: 6px 14px 6px 10px;
  border-radius: 999px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 1px 4px rgb(14 21 46 / 0.2);
  font-size: 0.9375rem;
}

.msearch__poster {
  flex: none;
  inline-size: 64px;
  aspect-ratio: 2 / 3;
  border-radius: 3px;
  overflow: hidden;
}

.msearch__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-inline-size: 0;
}

.msearch__name {
  font-weight: 600;
}

.msearch__meta {
  color: rgb(var(--v-theme-on-surface), 0.65);
  font-size: 0.9375rem;
}

.msearch__option--active {
  background: rgb(var(--v-theme-on-surface), 0.08);
}

.msearch__empty {
  color: rgb(var(--v-theme-on-surface), 0.6);
}

/* Sits under the header (Vuetify app bar, z-index 1004) so the pill and results stay sharp */
.msearch__backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgb(0 0 0 / 0.6);
  backdrop-filter: blur(6px);
}

.msearch-backdrop-enter-active,
.msearch-backdrop-leave-active {
  transition: opacity 200ms ease;
}

.msearch-backdrop-enter-from,
.msearch-backdrop-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .msearch-backdrop-enter-active,
  .msearch-backdrop-leave-active {
    transition: none;
  }
}
</style>

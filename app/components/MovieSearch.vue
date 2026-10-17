<script setup lang="ts">
import type { Movie } from '#shared/types'

defineProps<{ movies: Movie[] }>()
const emit = defineEmits<{ select: [id: number] }>()

// The field only searches; a pick becomes a chip and the field resets for the next one
const selected = ref<number | null>(null)
const search = ref('')

function pick(id: number | null) {
  if (id === null) return
  emit('select', id)
  nextTick(() => {
    selected.value = null
    search.value = ''
  })
}

const label = (movie: Movie) => `${movie.title} (${movie.year})`
</script>

<template>
  <v-autocomplete
    v-model="selected"
    v-model:search="search"
    :items="movies"
    :item-title="label"
    item-value="id"
    :label="$t('search.label')"
    :no-data-text="$t('search.noData')"
    variant="outlined"
    hide-details
    auto-select-first
    data-testid="movie-search"
    @update:model-value="pick"
  >
    <template #item="{ props: itemProps, item }">
      <v-list-item
        v-bind="itemProps"
        :data-testid="`movie-option-${item.id}`"
      />
    </template>
  </v-autocomplete>
</template>

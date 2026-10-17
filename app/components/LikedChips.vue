<script setup lang="ts">
import type { Movie } from '#shared/types'

defineProps<{ movies: Movie[] }>()
defineEmits<{ remove: [id: number] }>()
</script>

<template>
  <div
    class="d-flex flex-wrap ga-2"
    data-testid="liked-chips"
  >
    <v-chip
      v-for="movie in movies"
      :key="movie.id"
      closable
      :close-label="$t('liked.remove', { title: movie.title })"
      data-testid="liked-chip"
      @click:close="$emit('remove', movie.id)"
    >
      {{ movie.title }} ({{ movie.year }})
    </v-chip>
  </div>
</template>

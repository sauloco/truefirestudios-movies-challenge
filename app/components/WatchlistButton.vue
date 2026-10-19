<script setup lang="ts">
import { mdiBookmark, mdiBookmarkOutline } from '@mdi/js'
import type { Movie } from '#shared/types'

const props = defineProps<{ movie: Movie }>()

const { has, toggle } = useWatchlist()
const listed = computed(() => has(props.movie.id))
</script>

<template>
  <v-btn
    :color="listed ? 'primary' : undefined"
    :variant="listed ? 'flat' : 'tonal'"
    :prepend-icon="`svg:${listed ? mdiBookmark : mdiBookmarkOutline}`"
    :aria-pressed="listed"
    data-testid="detail-watchlist"
    @click="toggle(movie.id)"
  >
    {{ listed ? $t('watchlist.onList') : $t('watchlist.addLabel') }}
  </v-btn>
</template>

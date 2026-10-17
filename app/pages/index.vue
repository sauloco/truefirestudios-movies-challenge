<script setup lang="ts">
const { data, status, error, refresh } = await useRecommendations(ref([]))
</script>

<template>
  <RecommendationGrid
    :recommendations="data"
    :pending="status === 'pending'"
    :failed="!!error"
    @retry="refresh()"
  />
</template>

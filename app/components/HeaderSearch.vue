<script setup lang="ts">
// The product name is the search field: picking a movie adds it to the likes wall
const { available, add } = await useLikedMovies()
</script>

<template>
  <MovieSearch
    :movies="available"
    @select="add"
  />
</template>

<script setup lang="ts">
const { active } = await useProfiles()
// The template keeps a stable root element: the router reads the page's element after every update,
// and a keyed async child alone has none while it remounts
</script>

<template>
  <div>
    <ProfileHome :key="active.id" />
  </div>
</template>

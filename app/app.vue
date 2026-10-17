<script setup lang="ts">
const { t, locale } = useI18n()

useHead({
  htmlAttrs: { lang: locale },
  title: () => `${t('app.title')} — ${t('app.tagline')}`
})
</script>

<template>
  <NuxtLayout>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </NuxtLayout>
</template>

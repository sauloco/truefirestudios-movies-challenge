<script setup lang="ts">
const { init, followSystem } = useColorMode()
const route = useRoute()
const getRouteBaseName = useRouteBaseName()
// The room fills the page edge to edge; every other page sits in a centred container.
// Compared by base name because the other locales serve it under a prefix (/es, /ja)
const fullBleed = computed(() => getRouteBaseName(route) === 'index')
init()
onMounted(followSystem)
</script>

<template>
  <v-app data-testid="app-shell">
    <v-app-bar
      class="app-header"
      location="top"
      floating
      data-testid="app-header"
    >
      <div class="app-search">
        <HeaderSearch />
      </div>
      <template #append>
        <UserSwitcher />
        <LanguageSwitcher />
        <ColorModeToggle />
      </template>
    </v-app-bar>
    <v-main :class="{ 'room-page': fullBleed }">
      <!-- One container for every page: switching between two branches would remount the page during navigation -->
      <v-container
        :fluid="fullBleed"
        :class="fullBleed ? 'pa-0' : 'py-6'"
      >
        <slot />
      </v-container>
    </v-main>
    <AppFooter />
  </v-app>
</template>

<style scoped>
/* Floating pill: inset from the viewport edges, translucent over a blurred backdrop */
.app-header {
  /* Vuetify pins the bar to both viewport edges, so the gutter is taken out of its width instead */
  inset-inline: 0 !important;
  inline-size: min(1080px, calc(100% - 24px)) !important;
  margin-block-start: 12px;
  margin-inline: auto !important;
  --header-pad: 28px;
  border: 1px solid rgb(var(--v-theme-on-surface), 0.12);
  border-radius: 999px !important;
  background: rgb(var(--v-theme-surface), 0.72) !important;
  backdrop-filter: blur(14px);
  transition: box-shadow 200ms ease, border-color 200ms ease;
}

/* Focusing the search lights the whole header with the same glow as a poster */
.app-header:has(.msearch__input:focus) {
  border-color: rgb(255 226 160 / 0.9);
  box-shadow: var(--underglow);
}

.app-search {
  flex: 1 1 auto;
  min-inline-size: 0;
  margin-inline-start: var(--header-pad);
}

/* The toolbar clips its children, which would hide the results dropdown hanging below the pill.
   Its own gutter would also keep the plate off the right edge. */
.app-header,
.app-header :deep(.v-toolbar__content) {
  overflow: visible !important;
}

.app-header :deep(.v-toolbar__content) {
  padding-inline-end: 0;
}

/* The viewer controls keep a soft plate behind them while the field is in use */
.app-header :deep(.v-toolbar__append) {
  align-self: stretch;
  align-items: center;
  margin-inline: 0;
  padding-inline: var(--header-pad) 16px;
  border-radius: 999px;
  transition: background-color 200ms ease;
}

.app-header:has(.msearch__input:focus) :deep(.v-toolbar__append) {
  background: rgb(var(--v-theme-surface), 0.85);
}

@media (prefers-reduced-motion: reduce) {
  .app-header,
  .app-header :deep(.v-toolbar__append) {
    transition: none;
  }
}
</style>

<script setup lang="ts">
const { init, followSystem } = useColorMode()
const route = useRoute()
// The room fills the page edge to edge; every other page sits in a centred container
const fullBleed = computed(() => route.path === '/')
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
      <v-spacer />
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
  inset-inline: 12px;
  inline-size: auto;
  margin-block-start: 12px;
  max-inline-size: 1080px;
  margin-inline: auto;
  background: rgba(var(--v-theme-surface), 0.72) !important;
  backdrop-filter: blur(14px);
}

.app-search {
  flex: 1 1 auto;
  min-inline-size: 0;
  max-inline-size: 360px;
  margin-inline-start: 12px;
  padding-block: 4px;
}
</style>

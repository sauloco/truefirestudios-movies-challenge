<script setup lang="ts">
const { init, followSystem } = useColorMode()
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
      <v-app-bar-title>
        <a
          class="app-brand"
          href="https://rusticit.com"
          rel="noopener"
          data-testid="app-title"
        >{{ $t('app.title') }}</a>
      </v-app-bar-title>
      <template #append>
        <UserSwitcher />
        <ColorModeToggle />
      </template>
    </v-app-bar>
    <v-main>
      <v-container class="py-6">
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

.app-brand {
  color: inherit;
  text-decoration: none;
  font-family: Rubik, Inter, system-ui, sans-serif;
  font-weight: 600;
}

.app-brand:hover {
  text-decoration: underline;
}
</style>

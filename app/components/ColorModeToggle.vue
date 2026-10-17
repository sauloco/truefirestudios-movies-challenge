<script setup lang="ts">
const { mode, toggle } = useColorMode()

const SUN = 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM2 13h2v-2H2v2zm18 0h2v-2h-2v2zM11 2v2h2V2h-2zm0 18v2h2v-2h-2zM5.99 4.58 4.58 5.99l1.41 1.42 1.42-1.42-1.42-1.41zm12.02 12.01-1.42 1.42 1.42 1.41 1.41-1.41-1.41-1.42zM18.01 7.41l1.41-1.42-1.41-1.41-1.42 1.41 1.42 1.42zM5.99 19.42l1.42-1.42-1.42-1.41-1.41 1.41 1.41 1.42z'
const MOON = 'M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.4 2.26 5.4 5.4 0 0 1-5.4-5.4c0-1.81.89-3.42 2.26-4.4A9.1 9.1 0 0 0 12 3z'
</script>

<template>
  <v-btn
    icon
    variant="text"
    size="small"
    :aria-label="mode === 'dark' ? $t('theme.switchToLight') : $t('theme.switchToDark')"
    :aria-pressed="mode === 'dark'"
    data-testid="theme-toggle"
    :data-mode="mode"
    @click="toggle"
  >
    <v-icon :icon="`svg:${mode === 'dark' ? SUN : MOON}`" />
  </v-btn>
</template>

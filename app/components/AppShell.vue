<template>
  <v-app data-testid="app-shell">
    <v-app-bar flat border="b">
      <v-app-bar-title data-testid="app-title">
        {{ $t('app.title') }}
      </v-app-bar-title>
    </v-app-bar>
    <v-main>
      <v-container class="py-6">
        <slot />
      </v-container>
    </v-main>
    <AppFooter />
  </v-app>
</template>

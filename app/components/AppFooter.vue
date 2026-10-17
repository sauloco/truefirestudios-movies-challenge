<template>
  <v-footer
    class="flex-column ga-3 py-6 text-center"
    data-testid="app-footer"
  >
    <a
      href="https://www.themoviedb.org/"
      target="_blank"
      rel="noopener"
      data-testid="tmdb-link"
    >
      <img
        src="/tmdb-logo.svg"
        :alt="$t('footer.tmdbLogoAlt')"
        width="164"
        height="21"
        data-testid="tmdb-logo"
      >
    </a>
    <p
      class="text-body-2"
      data-testid="tmdb-notice"
    >
      {{ $t('footer.tmdbNotice') }}
    </p>
  </v-footer>
</template>

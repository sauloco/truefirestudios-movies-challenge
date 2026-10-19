<template>
  <v-footer
    class="app-footer text-caption"
    data-testid="app-footer"
  >
    <a
      class="app-footer__logo"
      href="https://www.themoviedb.org/"
      target="_blank"
      rel="noopener"
      data-testid="tmdb-link"
    >
      <img
        src="/tmdb-logo.svg"
        :alt="$t('footer.tmdbLogoAlt')"
        width="70"
        height="9"
        data-testid="tmdb-logo"
      >
    </a>
    <span
      class="app-footer__text"
      data-testid="tmdb-notice"
    >{{ $t('footer.tmdbNotice') }}</span>
    <span
      class="app-footer__text app-footer__credit"
      data-testid="patterns-credit"
    >
      {{ $t('footer.patterns') }}
      <a
        href="https://heropatterns.com/"
        target="_blank"
        rel="noopener"
      >Hero Patterns</a>
      (<a
        href="https://creativecommons.org/licenses/by/4.0/"
        target="_blank"
        rel="noopener"
      >{{ $t('footer.patternsLicense') }}</a>)
    </span>
  </v-footer>
</template>

<style scoped>
.app-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 2px 14px;
  padding: 6px 12px;
  min-height: 0;
  line-height: 1.2;
}

.app-footer__logo {
  display: flex;
  flex: none;
}

.app-footer__logo img {
  display: block;
  height: 9px;
  width: auto;
}

.app-footer__text {
  min-width: 0;
}

/* Desktop: one small line pinned to the bottom of the viewport */
@media (min-width: 701px) {
  .app-footer {
    position: fixed;
    inset: auto 0 0;
    z-index: 10;
    flex-wrap: nowrap;
    height: var(--footer-h);
    padding-block: 0;
  }

  .app-footer__text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>

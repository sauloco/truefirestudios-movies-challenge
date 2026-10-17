<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const { t } = useI18n()
const notFound = computed(() => props.error.statusCode === 404)

useHead({ title: () => `${t(notFound.value ? 'error.notFoundTitle' : 'error.title')} — ${t('app.title')}` })
</script>

<template>
  <NuxtLayout>
    <section
      class="d-flex flex-column align-center text-center ga-3 py-12"
      data-testid="error-page"
    >
      <p
        class="text-h2 text-primary"
        data-testid="error-code"
      >
        {{ error.statusCode }}
      </p>
      <h1
        class="text-h5"
        data-testid="error-title"
      >
        {{ $t(notFound ? 'error.notFoundTitle' : 'error.title') }}
      </h1>
      <p class="text-body-1 text-medium-emphasis">
        {{ $t(notFound ? 'error.notFoundText' : 'error.text') }}
      </p>
      <v-btn
        color="primary"
        data-testid="error-home"
        @click="clearError({ redirect: '/' })"
      >
        {{ $t('error.home') }}
      </v-btn>
    </section>
  </NuxtLayout>
</template>

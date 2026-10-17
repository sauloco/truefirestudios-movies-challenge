<script setup lang="ts">
defineProps<{ retrying?: boolean }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <v-alert
    type="error"
    variant="tonal"
    :title="$t('recommendations.errorTitle')"
    :text="$t('recommendations.errorText')"
    data-testid="recommendation-error"
  >
    <template #append>
      <v-btn
        :loading="retrying"
        data-testid="recommendation-retry"
        @click="$emit('retry')"
      >
        {{ $t('recommendations.retry') }}
      </v-btn>
    </template>
  </v-alert>
</template>

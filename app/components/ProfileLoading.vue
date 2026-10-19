<script setup lang="ts">
const { state, startTimer } = useProfileLoading()
const { data: profiles } = useProfileList()

const profile = computed(() => profiles.value.find(candidate => candidate.id === state.value.targetId))

// The first minimum counts from page load, not from when the stored viewer is known
onMounted(startTimer)

// Without scripts nothing would ever lift the overlay
useHead({ noscript: [{ innerHTML: '<style>.profile-loading{display:none}</style>' }] })
</script>

<template>
  <Transition name="profile-loading">
    <div
      v-if="state.visible"
      class="profile-loading"
      role="status"
      aria-live="polite"
      data-testid="profile-loading"
    >
      <div class="profile-loading__card">
        <span
          v-if="profile"
          class="profile-loading__avatar"
          :style="{ backgroundColor: profile.tint }"
        >
          <img
            :src="profile.avatarUrl"
            alt=""
            width="64"
            height="64"
          >
        </span>
        <p class="profile-loading__text">
          {{ profile ? $t('profiles.loading', { name: profile.name }) : $t('profiles.loadingGeneric') }}
        </p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.profile-loading {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: grid;
  place-items: center;
  background: rgb(var(--v-theme-background), 0.45);
  backdrop-filter: blur(18px);
}

.profile-loading__card {
  display: grid;
  justify-items: center;
  gap: 16px;
}

.profile-loading__avatar {
  position: relative;
  inline-size: 64px;
  block-size: 64px;
  overflow: hidden;
  border-radius: 50%;
  animation: profile-loading-breathe 1.6s ease-in-out infinite;
}

.profile-loading__avatar img {
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  transform: scale(1.18) translateY(6%);
}

.profile-loading__text {
  font-family: Rubik, Inter, system-ui, sans-serif;
  font-size: 1.125rem;
  animation: profile-loading-fade 1.6s ease-in-out infinite;
}

@keyframes profile-loading-breathe {
  0%, 100% { box-shadow: 0 0 0 0 rgb(var(--v-theme-primary), 0.5); transform: scale(1); }
  50% { box-shadow: 0 0 0 14px rgb(var(--v-theme-primary), 0); transform: scale(1.04); }
}

@keyframes profile-loading-fade {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* Lifting the overlay un-blurs the room underneath */
.profile-loading-enter-active,
.profile-loading-leave-active {
  transition: opacity 450ms ease, backdrop-filter 450ms ease;
}

.profile-loading-enter-from,
.profile-loading-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
}

@media (prefers-reduced-motion: reduce) {
  .profile-loading__avatar,
  .profile-loading__text {
    animation: none;
  }

  .profile-loading-enter-active,
  .profile-loading-leave-active {
    transition: none;
  }
}
</style>

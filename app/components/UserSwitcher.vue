<script setup lang="ts">
const { t } = useI18n()
const { profiles, active, switchTo } = await useProfiles()

// A radiogroup with a roving tabindex: Tab enters on the active viewer, the arrow keys move between viewers
const radios = ref<HTMLElement[]>([])

// Focus moves first so a key held down keeps stepping from the new viewer rather than the one still being left
function select(index: number) {
  radios.value[index]?.focus()
  return switchTo(profiles.value[index]!.id)
}

function onKeydown(event: KeyboardEvent, index: number) {
  const last = profiles.value.length - 1
  const targets: Record<string, number> = {
    ArrowRight: index === last ? 0 : index + 1,
    ArrowDown: index === last ? 0 : index + 1,
    ArrowLeft: index === 0 ? last : index - 1,
    ArrowUp: index === 0 ? last : index - 1,
    Home: 0,
    End: last
  }
  if (event.key in targets) {
    event.preventDefault()
    return select(targets[event.key]!)
  }
}

const label = (profile: (typeof profiles.value)[number]) =>
  `${profile.name}, ${t(`profiles.languages.${profile.language}`)}, ${t('profiles.likedCount', profile.liked.length)}`
</script>

<template>
  <div class="d-flex align-center ga-2">
    <span
      class="switcher__name text-body-2 d-none d-sm-inline"
      data-testid="active-profile-name"
    >{{ active.name }}</span>
    <div
      class="switcher"
      role="radiogroup"
      :aria-label="$t('profiles.switcher')"
      data-testid="user-switcher"
    >
      <button
        v-for="(profile, index) in profiles"
        :key="profile.id"
        ref="radios"
        type="button"
        role="radio"
        class="switcher__item"
        :class="{ 'switcher__item--active': profile.id === active.id }"
        :aria-checked="profile.id === active.id"
        :aria-label="profile.name"
        :tabindex="profile.id === active.id ? 0 : -1"
        :style="{ backgroundColor: profile.tint }"
        :data-testid="`user-${profile.id}`"
        @click="switchTo(profile.id)"
        @keydown="onKeydown($event, index)"
      >
        <img
          class="switcher__image"
          :src="profile.avatarUrl"
          alt=""
          width="36"
          height="36"
        >
        <v-tooltip
          activator="parent"
          location="bottom"
        >
          {{ label(profile) }}
        </v-tooltip>
      </button>
    </div>
  </div>
</template>

<style scoped>
.switcher {
  display: flex;
  align-items: center;
  padding-inline: 4px;
}

.switcher__item {
  --overlap: -10px;
  position: relative;
  flex: none;
  inline-size: 36px;
  block-size: 36px;
  padding: 0;
  overflow: hidden;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid rgb(var(--v-theme-surface));
  transition: margin 160ms ease, transform 160ms ease, box-shadow 160ms ease;
}

.switcher__item + .switcher__item {
  margin-inline-start: var(--overlap);
}

/* The face sits off-centre in the artwork, so crop in a little */
.switcher__image {
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  transform: scale(1.18) translateY(6%);
}

.switcher__item--active {
  z-index: 2;
  box-shadow: 0 0 0 2px rgb(var(--v-theme-primary));
  transform: translateY(-1px);
}

/* Hovering or focusing anywhere in the stack spreads it so each viewer can be hit */
.switcher:hover .switcher__item + .switcher__item,
.switcher:focus-within .switcher__item + .switcher__item {
  --overlap: 2px;
}

.switcher__item:focus-visible {
  z-index: 3;
}

@media (max-width: 599px) {
  .switcher__item {
    --overlap: -14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .switcher__item {
    transition: none;
  }
}
</style>

<script setup lang="ts">
const props = defineProps<{ front: boolean }>()

// The site is only requested once the camera has turned to this wall, so a normal visit never loads it
const powered = ref(false)
watch(() => props.front, (front) => {
  if (front) powered.value = true
}, { immediate: true })
</script>

<template>
  <div class="egg">
    <h2 class="room-heading">
      {{ $t('room.egg.title') }}
    </h2>
    <div class="egg__screen">
      <iframe
        v-if="powered"
        class="egg__frame"
        src="https://rusticit.com/"
        :title="$t('room.egg.frameTitle')"
        sandbox="allow-scripts allow-same-origin allow-popups"
        referrerpolicy="no-referrer"
        data-testid="egg-frame"
      />
      <span
        v-else
        class="egg__idle"
      >{{ $t('room.egg.idle') }}</span>
      <i
        class="egg__stand"
        aria-hidden="true"
      />
    </div>
    <a
      class="egg__link"
      href="https://rusticit.com"
      target="_blank"
      rel="noopener"
    >{{ $t('room.egg.open') }}</a>
  </div>
</template>

<style scoped>
.egg__screen {
  position: relative;
  margin-inline: auto;
  max-width: 760px;
  padding: 12px 12px 22px;
  border-radius: 12px;
  background: #0b0e1c;
  box-shadow: 0 12px 26px rgb(0 0 0 / 0.45), inset 0 0 0 2px #2c3150;
}

.egg__frame,
.egg__idle {
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 16 / 10;
  border: 0;
  border-radius: 4px;
  background: #fff;
}

.egg__idle {
  background: #05070f;
  color: #4a5073;
  font-size: 0.9rem;
}

.egg__stand {
  position: absolute;
  left: 50%;
  bottom: 7px;
  width: 34px;
  height: 5px;
  margin-left: -17px;
  border-radius: 3px;
  background: #2c3150;
}

.egg__link {
  display: block;
  margin-top: 12px;
  text-align: center;
  font-weight: 600;
  font-size: 0.85rem;
  color: inherit;
}
</style>

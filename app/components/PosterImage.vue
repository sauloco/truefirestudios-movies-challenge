<script setup lang="ts">
import { decode } from 'blurhash'

const props = defineProps<{
  src: string | null
  blurhash: string | null
  title: string
  eager?: boolean
}>()

// The hash only carries the colour layout, so a tiny canvas scaled up by CSS is enough
const CANVAS_WIDTH = 32
const CANVAS_HEIGHT = 48

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const image = useTemplateRef<HTMLImageElement>('image')
const loaded = ref(false)
const failed = ref(!props.src)
// A cached image must be visible in the first frame, which a view transition snapshots
const instant = ref(false)

function drawBlurhash() {
  const context = canvas.value?.getContext('2d')
  if (!context || !props.blurhash) return
  const pixels = decode(props.blurhash, CANVAS_WIDTH, CANVAS_HEIGHT)
  const data = context.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT)
  data.data.set(pixels)
  context.putImageData(data, 0, 0)
}

onMounted(() => {
  drawBlurhash()
  // The image may have settled before hydration, when no load/error listener was attached yet
  const settled = image.value
  if (settled?.complete) {
    if (settled.naturalWidth > 0) {
      loaded.value = true
      instant.value = true
    }
    else failed.value = true
  }
})

watch(() => props.src, (src) => {
  loaded.value = false
  instant.value = false
  failed.value = !src
})
watch(() => props.blurhash, drawBlurhash)
</script>

<template>
  <div
    class="poster"
    data-testid="poster"
    :data-state="failed ? 'failed' : loaded ? 'loaded' : 'loading'"
  >
    <canvas
      ref="canvas"
      class="poster__layer"
      :width="CANVAS_WIDTH"
      :height="CANVAS_HEIGHT"
      aria-hidden="true"
      data-testid="poster-blurhash"
    />
    <img
      v-if="src && !failed"
      ref="image"
      class="poster__layer poster__image"
      :class="{ 'poster__image--loaded': loaded, 'poster__image--instant': instant }"
      :src="src"
      :alt="$t('poster.alt', { title })"
      :loading="eager ? 'eager' : 'lazy'"
      data-testid="poster-image"
      @load="loaded = true"
      @error="failed = true"
    >
    <span
      v-if="failed"
      class="poster__title text-subtitle-2"
      data-testid="poster-fallback-title"
    >
      {{ title }}
    </span>
  </div>
</template>

<style scoped>
.poster {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3;
  overflow: hidden;
  background: rgb(var(--v-theme-surface-variant));
}

.poster__layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.poster__image {
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.4s ease;
}

.poster__image--loaded {
  opacity: 1;
}

.poster__image--instant {
  transition: none;
}

.poster__title {
  position: absolute;
  inset: auto 0 0;
  padding: 8px;
  color: #fff;
  background: rgba(0, 0, 0, 0.6);
  text-align: center;
  overflow-wrap: anywhere;
}
</style>

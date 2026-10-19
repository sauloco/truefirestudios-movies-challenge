<script setup lang="ts">
import type { WallPattern } from '#shared/types'

defineProps<{
  tint: string
  pattern: WallPattern
}>()

defineSlots<{
  likes: (props: { front: boolean }) => unknown
  recs: (props: { front: boolean }) => unknown
  watch: (props: { front: boolean }) => unknown
  egg: (props: { front: boolean }) => unknown
}>()

const { t } = useI18n()
const room = useRoom()

// Source order puts the recommendations first, so they stay first for crawlers and screen readers
const SOURCE_ORDER: WallId[] = ['recs', 'likes', 'watch', 'egg']
const TABS: WallId[] = ['likes', 'recs', 'watch']
const WALL_TURN = 34

function side(slot: number) {
  return slot < 0 ? 'l' : slot > 0 ? 'r' : 'c'
}

function wallStyle(wall: WallId) {
  const slot = room.slotOf(wall)
  const turn = { l: WALL_TURN, r: -WALL_TURN, c: 0 }[side(slot)]
  return {
    transform: `translateX(${slot * 100}%) rotateY(${turn}deg)`,
    transformOrigin: { l: '100% 50%', r: '0 50%', c: '50% 50%' }[side(slot)],
    ...(room.snapping.value === WALLS.indexOf(wall) ? { transition: 'none' } : {})
  }
}

const label = (wall: WallId) => ({
  likes: t('liked.heading'),
  recs: t('recommendations.headingPersonalized'),
  watch: t('watchlist.heading'),
  egg: t('room.egg.title')
})[wall]

// Arrow keys and swipes turn the camera; typing in the search field and its menu keep their own arrows
function onKeydown(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [role="combobox"], [contenteditable]')) return
  if (document.querySelector('.v-overlay--active')) return
  room.move(event.key === 'ArrowRight' ? 1 : -1)
}

let touchStart: { x: number, y: number } | null = null
function onTouchStart(event: TouchEvent) {
  const point = event.changedTouches[0]!
  touchStart = { x: point.clientX, y: point.clientY }
}
function onTouchEnd(event: TouchEvent) {
  const point = event.changedTouches[0]!
  if (!touchStart) return
  const dx = point.clientX - touchStart.x
  const dy = point.clientY - touchStart.y
  touchStart = null
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) room.move(dx < 0 ? 1 : -1)
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div
    class="room-stage"
    :class="`room-stage--${pattern}`"
    :style="{ '--tint': tint }"
    data-testid="room"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <nav
      class="room-tabs"
      :aria-label="$t('room.walls')"
    >
      <button
        v-for="wall in TABS"
        :key="wall"
        type="button"
        :aria-pressed="room.frontWall.value === wall"
        :data-testid="`wall-tab-${wall}`"
        @click="room.goTo(wall)"
      >
        {{ $t(`room.tabs.${wall}`) }}
      </button>
    </nav>

    <div
      class="room"
    >
      <div
        class="room-ceiling"
        aria-hidden="true"
      />
      <div
        class="room-floor"
        aria-hidden="true"
      />
      <section
        v-for="wall in SOURCE_ORDER"
        :key="wall"
        class="room-wall"
        :class="`room-wall--${wall}`"
        :style="wallStyle(wall)"
        :aria-label="label(wall)"
        :data-wall="wall"
        :data-side="side(room.slotOf(wall))"
        :data-hidden="Math.abs(room.slotOf(wall)) > 1 ? '' : undefined"
        :data-testid="`wall-${wall}`"
      >
        <!-- Walls that are not in front are for looking at: nothing in them can be tabbed to or read until the camera turns -->
        <div
          class="room-wall__body"
          :inert="room.slotOf(wall) !== 0 ? true : undefined"
        >
          <slot
            :name="wall"
            :front="room.slotOf(wall) === 0"
          />
        </div>
        <button
          v-if="Math.abs(room.slotOf(wall)) === 1"
          type="button"
          class="room-wall__cover"
          tabindex="-1"
          aria-hidden="true"
          @mousedown.prevent
          @click="room.move(room.slotOf(wall) < 0 ? -1 : 1)"
        />
      </section>
    </div>
  </div>
</template>

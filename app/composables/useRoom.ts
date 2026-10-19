// The room is a ring of four walls. The camera faces one; its neighbours stay angled at the edges and the
// fourth is parked out of sight until the camera turns toward it
export const WALLS = ['likes', 'recs', 'watch', 'egg'] as const
export type WallId = typeof WALLS[number]

const MOVE_MS = 460

// Slot 0 is in front of the camera, -1 and 1 peek in from the sides, +-2 is parked off-screen
function slotsFor(front: number) {
  return WALLS.map((_, wall) => {
    const offset = (wall - front + WALLS.length) % WALLS.length
    return offset === 3 ? -1 : offset
  })
}

export function useRoom() {
  // Kept in state so coming back from a movie page finds the camera where it was left
  const front = useState('room-front', () => 1)
  const slots = useState<number[]>('room-slots', () => slotsFor(front.value))
  // The wall being re-parked is moved without a transition so it can slide in from the right side
  const snapping = ref<number | null>(null)
  // Turns run one after another; a key held down or a double click queues at most one more
  let queue: Promise<void> = Promise.resolve()
  let pending = 0

  const frontWall = computed(() => WALLS[front.value]!)
  const slotOf = (wall: WallId) => slots.value[WALLS.indexOf(wall)]!

  async function turn(direction: 1 | -1) {
    // Park the hidden wall on the side the camera is heading to, so it enters as the next neighbour
    const hidden = slots.value.findIndex(slot => Math.abs(slot) === 2)
    snapping.value = hidden
    slots.value = slots.value.map((slot, wall) => wall === hidden ? direction * 2 : slot)
    await nextTick()
    await new Promise(resolve => requestAnimationFrame(resolve))
    snapping.value = null
    slots.value = slots.value.map(slot => slot - direction)
    front.value = (front.value + direction + WALLS.length) % WALLS.length
    await new Promise(resolve => setTimeout(resolve, MOVE_MS))
  }

  function move(direction: 1 | -1) {
    if (pending >= 2) return queue
    pending++
    queue = queue.then(() => turn(direction)).catch(() => undefined).finally(() => {
      pending--
    })
    return queue
  }

  // Walks the shortest way, going through the middle wall rather than round the back
  async function goTo(wall: WallId) {
    const target = WALLS.indexOf(wall)
    const delta = (target - front.value + WALLS.length) % WALLS.length
    if (!delta) return
    const direction = delta === 2 ? (front.value === 2 ? -1 : 1) : delta === 1 ? 1 : -1
    const steps = delta === 3 ? 1 : delta
    for (let step = 0; step < steps; step++) {
      await move(direction)
    }
  }

  return { front, frontWall, slots, snapping, slotOf, move, goTo }
}

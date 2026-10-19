import type { Profile } from '#shared/types'

// The overlay stays at least this long, even when the profile is already loaded behind it
export const PROFILE_LOADING_MIN_MS = 1000

let timer: ReturnType<typeof setTimeout> | undefined

// The overlay covers the room while a viewer is being switched to or restored, so the swap never shows as a jump.
// It lifts once the minimum time has passed and the room of the target viewer has its results.
export function useProfileLoading() {
  const state = useState('profile-loading', () => ({
    visible: true,
    targetId: null as string | null,
    name: null as string | null,
    readyId: null as string | null,
    elapsed: false
  }))

  function settle() {
    if (state.value.elapsed && state.value.targetId && state.value.readyId === state.value.targetId) state.value.visible = false
  }

  function startTimer() {
    clearTimeout(timer)
    state.value.elapsed = false
    timer = setTimeout(() => {
      state.value.elapsed = true
      settle()
    }, PROFILE_LOADING_MIN_MS)
  }

  // A viewer switch: cover the room again and restart the minimum
  function show(profile: Profile) {
    state.value = { ...state.value, visible: true, targetId: profile.id, name: profile.name }
    startTimer()
  }

  // The viewer shown at startup is known only after the stored one is restored; the minimum keeps running from page load
  function target(profile: Profile) {
    state.value.targetId = profile.id
    state.value.name = profile.name
    settle()
  }

  function markReady(id: string) {
    state.value.readyId = id
    settle()
  }

  return { state, show, target, markReady, startTimer }
}

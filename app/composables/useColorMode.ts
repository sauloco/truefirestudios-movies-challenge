export type ColorMode = 'light' | 'dark'

// The explicit choice lives in a cookie so SSR and the first client render agree.
// Without a choice we start light and follow the system preference once mounted.
export function useColorMode() {
  const theme = useTheme()
  const choice = useCookie<ColorMode | null>('color-mode', {
    default: () => null,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax'
  })

  const mode = computed<ColorMode>(() => theme.name.value === 'dark' ? 'dark' : 'light')

  function apply(next: ColorMode) {
    theme.change(next)
  }

  function toggle() {
    const next: ColorMode = mode.value === 'dark' ? 'light' : 'dark'
    choice.value = next
    apply(next)
  }

  function init() {
    if (choice.value) apply(choice.value)
  }

  function followSystem() {
    if (choice.value) return
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const follow = () => {
      if (!choice.value) apply(query.matches ? 'dark' : 'light')
    }
    follow()
    query.addEventListener('change', follow)
  }

  return { mode, toggle, init, followSystem }
}

// Who is viewing and what they picked lives in localStorage, not in the URL, so the address stays `/`.
// `picks` only holds viewers who changed something; everyone else shows the likes the backend gives their profile.
interface ViewerState {
  user: string | null
  picks: Record<string, number[]>
  // Language each viewer chose for themselves; a viewer missing here keeps their profile's own language
  languages: Record<string, string>
}

const STORAGE_KEY = 'viewer'

export function readViewer(): ViewerState {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<ViewerState>
    const picks = Object.fromEntries(Object.entries(parsed.picks ?? {})
      .filter(([, ids]) => Array.isArray(ids))
      .map(([id, ids]) => [id, ids.filter(Number.isInteger)]))
    const languages = Object.fromEntries(Object.entries(parsed.languages ?? {}).filter(([, code]) => typeof code === 'string'))
    return { user: typeof parsed.user === 'string' ? parsed.user : null, picks, languages }
  }
  catch {
    return { user: null, picks: {}, languages: {} }
  }
}

// The server and the first client render both show the default viewer; the stored one is applied after mount
// (plugins/viewer.client.ts), which keeps the HTML identical instead of mismatching
export function useViewer() {
  const state = useState<ViewerState>('viewer', () => ({ user: null, picks: {}, languages: {} }))

  function update(next: Partial<ViewerState>) {
    state.value = { ...state.value, ...next }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
    }
    catch {
      // Storage can be blocked or full; the choice still holds for this visit
    }
  }

  return { state, update }
}

import { url } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'

// The viewer lives in localStorage, not the URL. Tests keep describing a visit as `/?user=sam&liked=1,2`:
// the viewer is stored first (same origin, before the app loads) and the page is opened on the clean path.
// `?user=` without `liked` means a viewer with no picks, `liked` is left out for bare paths and unseeded visits.
export async function gotoAs(page: Page, path: string) {
  const target = new URL(path, 'http://app.test')
  const user = target.searchParams.get('user')
  if (user) {
    const liked = target.searchParams.get('liked')
    const picks = liked ? liked.split(',').map(Number).filter(Number.isInteger) : []
    await page.goto(url('/api/profiles'))
    await page.evaluate(state => localStorage.setItem('viewer', JSON.stringify(state)), { user, picks: { [user]: picks } })
  }
  await page.goto(url(target.pathname + target.hash))
  await page.waitForFunction(() => 'viewerReady' in document.documentElement.dataset)
  if (user) {
    // Switching remounts the room asynchronously; wait for the new viewer and for their results to settle
    await page.locator(`[data-testid="user-${user}"][aria-checked="true"]`).waitFor()
    await page.waitForLoadState('networkidle')
  }
}

// The stored viewer after an action; `picks` is only compared when given
export async function waitForViewer(page: Page, user: string, picks?: number[]) {
  await page.waitForFunction(({ user, picks }) => {
    const state = JSON.parse(localStorage.getItem('viewer') ?? '{}')
    return state.user === user && (!picks || JSON.stringify(state.picks?.[user]) === JSON.stringify(picks))
  }, { user, picks })
}

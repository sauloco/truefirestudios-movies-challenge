import { url } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'

// The viewer lives in localStorage, not the URL. Tests keep describing a visit as `/?user=sam&liked=1,2`:
// the viewer is stored first (same origin, before the app loads) and the page is opened on the clean path.
// `?user=` without `liked` means a viewer with no picks, `liked` is left out for bare paths and unseeded visits.
export async function gotoAs(page: Page, path: string, { settle = true }: { settle?: boolean } = {}) {
  const target = new URL(path, 'http://app.test')
  const user = target.searchParams.get('user')
  let shown = user
  if (user) {
    const liked = target.searchParams.get('liked')
    const picks = liked ? liked.split(',').map(Number).filter(Number.isInteger) : []
    await page.goto(url('/api/profiles'))
    // An unknown viewer falls back to the first profile
    const ids = await page.evaluate(() => JSON.parse(document.body.innerText).map((profile: { id: string }) => profile.id) as string[])
    if (!ids.includes(user)) shown = ids[0]!
    await page.evaluate(state => localStorage.setItem('viewer', JSON.stringify(state)), { user, picks: { [user]: picks } })
  }
  await page.goto(url(target.pathname + target.hash))
  await page.waitForFunction(() => 'viewerReady' in document.documentElement.dataset)
  if (user) {
    // Switching remounts the room asynchronously; wait for the new viewer and for their results to settle
    await page.locator(`[data-testid="user-${shown}"][aria-checked="true"]`).waitFor()
    if (settle) await page.waitForLoadState('networkidle')
  }
  await waitForRoom(page)
}

// The profile overlay covers the room for at least a second after load or a viewer switch and swallows clicks
export async function waitForRoom(page: Page) {
  await page.locator('[data-testid="profile-loading"]').waitFor({ state: 'detached' })
}

// The stored viewer after an action; `picks` is only compared when given
export async function waitForViewer(page: Page, user: string, picks?: number[]) {
  await page.waitForFunction(({ user, picks }) => {
    const state = JSON.parse(localStorage.getItem('viewer') ?? '{}')
    return state.user === user && (!picks || JSON.stringify(state.picks?.[user]) === JSON.stringify(picks))
  }, { user, picks })
}

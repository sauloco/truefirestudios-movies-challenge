import type { Page } from 'playwright-core'

// The likes and the watchlist hang on the side walls; acting on them needs the camera turned to face the wall
export async function faceWall(page: Page, wall: 'likes' | 'recs' | 'watch') {
  await page.locator(`[data-testid="wall-tab-${wall}"]`).dispatchEvent('click')
  await page.waitForFunction(
    name => document.querySelector(`[data-testid="wall-${name}"]`)?.getAttribute('data-side') === 'c',
    wall
  )
}

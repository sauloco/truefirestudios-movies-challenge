import { describe, expect, it } from 'vitest'
import { createPage, fetch, setup } from '@nuxt/test-utils/e2e'

describe('smoke', async () => {
  await setup({ browser: true })

  it('renders the home page', async () => {
    const page = await createPage('/')
    await page.waitForSelector('[data-testid="app-shell"]')
    expect(await page.locator('[data-testid="app-shell"]').isVisible()).toBe(true)
    await page.close()
  })

  it('does not serve the raw movies data publicly', async () => {
    const response = await fetch('/movies.json')
    expect(response.headers.get('content-type') ?? '').not.toContain('application/json')
    expect(await response.text()).not.toContain('Toy Story')
  })
})

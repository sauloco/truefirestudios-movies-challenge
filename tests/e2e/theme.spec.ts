import { describe, expect, it } from 'vitest'
import { createPage, setup, url } from '@nuxt/test-utils/e2e'

const toggle = '[data-testid="theme-toggle"]'
const shell = '[data-testid="app-shell"]'

describe('theme', async () => {
  await setup({ browser: true })

  it('starts light and switches to dark with the toggle', async () => {
    const page = await createPage('/', { colorScheme: 'light' })
    await page.locator(toggle).waitFor()
    await page.waitForFunction(() => document.querySelector('[data-testid="theme-toggle"]')?.getAttribute('data-mode') === 'light')
    expect(await page.locator(shell).getAttribute('class')).toContain('v-theme--light')

    await page.locator(toggle).click()
    await page.waitForSelector(`${shell}.v-theme--dark`)
    expect(await page.locator(toggle).getAttribute('data-mode')).toBe('dark')
    expect(await page.locator(toggle).getAttribute('aria-pressed')).toBe('true')
    const background = await page.locator(shell).evaluate(el => getComputedStyle(el).backgroundColor)
    expect(background).toBe('rgb(14, 21, 46)')
    await page.close()
  })

  it('keeps the chosen theme after a reload', async () => {
    const page = await createPage('/', { colorScheme: 'light' })
    await page.locator(toggle).waitFor()
    await page.waitForFunction(() => document.querySelector('[data-testid="theme-toggle"]')?.getAttribute('data-mode') === 'light')
    await page.locator(toggle).click()
    await page.waitForSelector(`${shell}.v-theme--dark`)

    await page.reload()
    await page.waitForSelector(`${shell}.v-theme--dark`)
    expect(await page.locator(toggle).getAttribute('data-mode')).toBe('dark')

    await page.locator(toggle).click()
    await page.waitForSelector(`${shell}.v-theme--light`)
    await page.reload()
    await page.waitForSelector(`${shell}.v-theme--light`)
    await page.close()
  })

  it('follows a dark system preference until the visitor chooses', async () => {
    const page = await createPage('/', { colorScheme: 'dark' })
    await page.waitForSelector(`${shell}.v-theme--dark`)
    expect(await page.locator(toggle).getAttribute('data-mode')).toBe('dark')
    await page.close()
  })

  it('lets the toggle be reached and used with the keyboard', async () => {
    const page = await createPage('/', { colorScheme: 'light' })
    await page.locator(toggle).waitFor()
    await page.waitForFunction(() => document.querySelector('[data-testid="theme-toggle"]')?.getAttribute('data-mode') === 'light')
    await page.locator(toggle).focus()
    await page.keyboard.press('Enter')
    await page.waitForSelector(`${shell}.v-theme--dark`)
    await page.close()
  })

  it.each(['light', 'dark'] as const)('has no horizontal scroll at 360px in the %s theme', async (colorScheme) => {
    const page = await createPage()
    await page.emulateMedia({ colorScheme })
    await page.setViewportSize({ width: 360, height: 640 })
    await page.goto(url('/?liked=1,2,3'))
    await page.waitForSelector('[data-testid="movie-card"]')
    await page.waitForSelector(`${shell}.v-theme--${colorScheme}`)

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
    const header = (await page.locator('[data-testid="app-header"]').boundingBox())!
    expect(header.x).toBeGreaterThanOrEqual(0)
    expect(header.x + header.width).toBeLessThanOrEqual(360)
    await page.close()
  })

  it('renders every visible string from the en locale', async () => {
    const en = (await import('../../i18n/locales/en.json')).default
    const page = await createPage('/?liked=1')
    await page.waitForSelector('[data-testid="movie-card"]')

    expect(await page.locator('[data-testid="app-title"]').innerText()).toBe(en.app.title)
    expect(await page.locator('h1').innerText()).toBe(en.liked.heading)
    expect(await page.locator('[data-testid="recommendations-heading"]').innerText()).toBe(en.recommendations.headingPersonalized)
    expect(await page.locator('[data-testid="tmdb-notice"]').innerText()).toBe(en.footer.tmdbNotice)
    expect(await page.locator(toggle).getAttribute('aria-label')).toMatch(new RegExp(`^(${en.theme.switchToDark}|${en.theme.switchToLight})$`))
    await page.close()
  })

  it('links the product name to rusticit.com', async () => {
    const page = await createPage('/')
    const link = page.locator('[data-testid="app-title"]')
    await link.waitFor()
    expect(await link.getAttribute('href')).toBe('https://rusticit.com')
    await page.close()
  })
})


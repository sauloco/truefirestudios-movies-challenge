import type { Page } from 'playwright-core'

export const UMAMI_SCRIPT = 'https://cloud.umami.is/script.js'
const UMAMI_HOSTS = /^https:\/\/(cloud\.umami\.is|api-gateway\.umami\.dev)\//

export interface UmamiEvent {
  event: string
  data?: Record<string, string | number>
}

// Stands in for Umami's tracker: records `umami.track` calls in the page and never reaches the real host.
// Any other request to an Umami host is collected in `stray` so a spec can assert nothing leaked.
export async function stubUmami(page: Page) {
  const stray: string[] = []
  await page.route(UMAMI_HOSTS, (route) => {
    const request = route.request()
    if (request.url() === UMAMI_SCRIPT) {
      return route.fulfill({
        status: 200,
        contentType: 'text/javascript',
        body: 'window.__umamiEvents = []; window.umami = { track: (event, data) => window.__umamiEvents.push({ event, data }) };'
      })
    }
    stray.push(request.url())
    return route.fulfill({ status: 204 })
  })

  return {
    stray,
    events: () => page.evaluate(() => (window as unknown as { __umamiEvents?: UmamiEvent[] }).__umamiEvents ?? [])
  }
}

// Records every request aimed at an Umami host, answering none of them
export async function watchUmamiRequests(page: Page) {
  const requests: string[] = []
  await page.route(UMAMI_HOSTS, (route) => {
    requests.push(route.request().url())
    return route.abort('failed')
  })
  return requests
}

type UmamiData = Record<string, string | number>

declare global {
  interface Window {
    umami?: { track: (event: string, data?: UmamiData) => void }
  }
}

// Payloads carry movie ids and counts only. Umami's script is absent in dev, in tests and when
// blocked by the visitor, so tracking is a no-op rather than an error
export function useAnalytics() {
  function track(event: string, data?: UmamiData) {
    if (!import.meta.client) return
    try {
      window.umami?.track(event, data)
    } catch {
      // Analytics must never break the app
    }
  }

  return {
    moviePicked: (movieId: number, pickCount: number) => track('movie-picked', { movieId, pickCount }),
    movieRemoved: (movieId: number, pickCount: number) => track('movie-removed', { movieId, pickCount }),
    recommendationsShown: (pickCount: number, source: 'personalized' | 'popular') =>
      track('recommendations-shown', { pickCount, source }),
    recommendationClicked: (movieId: number, source: 'personalized' | 'popular') =>
      track('recommendation-clicked', { movieId, source })
  }
}

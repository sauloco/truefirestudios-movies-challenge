import type { RecommendationsResponse } from '#shared/types'

const RECOMMENDATION_LIMIT = 12
const DEBOUNCE_MS = 250

// Re-fetches whenever the picks settle; each distinct set of picks is its own cache key
export function useRecommendations(liked: Ref<number[]>) {
  const settled = ref([...liked.value])

  if (import.meta.client) {
    let timer: ReturnType<typeof setTimeout> | undefined
    watch(liked, (picks) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        settled.value = [...picks]
      }, DEBOUNCE_MS)
    })
    onScopeDispose(() => clearTimeout(timer))
  }

  return useFetch<RecommendationsResponse>('/api/recommendations', {
    method: 'POST',
    key: computed(() => `recommendations:${settled.value.join(',')}`),
    body: computed(() => ({ liked: settled.value, limit: RECOMMENDATION_LIMIT }))
  })
}

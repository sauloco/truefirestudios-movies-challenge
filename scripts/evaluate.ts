// Leave-one-out hit@5 evaluation used to choose POPULARITY_ALPHA.
// For every user with at least MIN_LIKES likes, hide one liked movie, recommend from the
// rest and check whether the hidden movie lands in the top 5.
//
//   npm run evaluate            sweep the default alpha values
//   npm run evaluate -- 0.6 0.7 sweep the given alpha values
import { buildModel, MIN_CO_LIKES, POPULARITY_ALPHA, recommend } from '../server/utils/recommender.ts'
import { getDataset } from '../server/utils/dataset.ts'

const MIN_LIKES = 5
const TOP_N = 5
const DEFAULT_ALPHAS = [0.5, 0.55, 0.6, 0.625, 0.65, 0.675, 0.7, 0.8]

const dataset = getDataset()
const model = buildModel(dataset)
const eligible = dataset.users.filter(liked => liked.length >= MIN_LIKES)

// Deterministic choice of the hidden movie: rotates through each user's likes by user index
function holdOut(liked: number[], index: number): { hidden: number, visible: number[] } {
  const hidden = liked[index % liked.length]!
  return { hidden, visible: liked.filter(id => id !== hidden) }
}

function hitRate(alpha: number): number {
  let hits = 0
  eligible.forEach((liked, index) => {
    const { hidden, visible } = holdOut(liked, index)
    const { items } = recommend(model, visible, { limit: TOP_N, alpha })
    if (items.some(item => item.id === hidden)) hits++
  })
  return hits / eligible.length
}

function popularBaseline(): number {
  let hits = 0
  eligible.forEach((liked, index) => {
    const { hidden, visible } = holdOut(liked, index)
    // Most popular movies the user has not already liked
    const top = recommend(model, [], { limit: TOP_N + visible.length }).items
      .filter(item => !visible.includes(item.id))
      .slice(0, TOP_N)
    if (top.some(item => item.id === hidden)) hits++
  })
  return hits / eligible.length
}

const argAlphas = process.argv.slice(2).map(Number)
const alphas = argAlphas.length ? argAlphas : DEFAULT_ALPHAS

console.log(`users evaluated: ${eligible.length} (>= ${MIN_LIKES} likes), min co-likes: ${MIN_CO_LIKES}`)
console.log(`most-popular baseline hit@${TOP_N}: ${popularBaseline().toFixed(3)}`)
for (const alpha of alphas) {
  const marker = alpha === POPULARITY_ALPHA ? '  <- POPULARITY_ALPHA' : ''
  console.log(`alpha ${alpha.toFixed(3)}  hit@${TOP_N}: ${hitRate(alpha).toFixed(3)}${marker}`)
}

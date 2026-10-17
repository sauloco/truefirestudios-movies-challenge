# Movies RusticIT

"People who liked these also liked…" for 70 movies and 806 users. Pick a few movies you like and get ranked recommendations, each with a plain-language reason ("Because you liked …") and a match score. With no picks it shows what is popular. The picks live in the URL (`?liked=20,59,60`), so a result page can be shared and survives a refresh. Each card opens a read-only detail page at `/movies/<id>` (blurred-poster header, overview, genres, and the match score when you arrive from a result); the poster and title animate between the two pages with a view transition.

Four demo viewers (avatars in the top right) each carry their own likes from the dataset; picking one switches the whole app to that viewer, with the viewer and picks in the URL (`?user=sam&liked=…`). **This is a proof of concept with no security**: anyone can be anyone, and the cookie that remembers the last viewer is only a convenience.

Built with Nuxt 4, Vuetify (themed after rusticit.com, light and dark), `@nuxtjs/i18n`, and a server-side recommender. Tests are browser end-to-end only.

## Requirements

Node.js 22.18 or newer (the scripts run TypeScript directly) and npm.

```bash
npm install
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` / `npm run preview` | Production build and local preview |
| `npm run lint` | ESLint (`@nuxt/eslint`) |
| `npm run typecheck` | `nuxt typecheck` (vue-tsc) |
| `npm run test:e2e` | Vitest + Playwright via `@nuxt/test-utils`; boots a real Nuxt server, calls the real API and drives a real browser |
| `npm run evaluate` | Leave-one-out evaluation of the recommender (see below) |
| `npm run build-catalog` | Regenerate the TMDB catalog (see below) |

The e2e suite needs a Chromium that Playwright can launch (`npx playwright-core install chromium` the first time). It never calls TMDB: the catalog is committed, poster requests are intercepted and the catalog script is tested against a recorded fixture.

## How recommendations work

Item-based collaborative filtering over a binary "liked" signal:

1. Count, for every pair of movies, how many users liked both (co-likes). Pairs with fewer than `MIN_CO_LIKES` (3) co-likes are ignored as noise.
2. Similarity is damped by popularity: `coLikes(p, c) / (likes(p)^(1-α) · likes(c)^α)`. With α = 0.5 this is plain cosine similarity, which hands blockbusters to everyone; a higher α makes results more tailored but less accurate.
3. A candidate's score is the sum of its similarity to every movie the visitor picked, normalised to 0–1. Picked movies are never recommended, and ties break by popularity then id so the output is deterministic.
4. Each result carries the top picks that contributed to it, which is the "Because you liked …" line.
5. Cold start: with no picks the most-liked movies are returned and labelled "Popular".

`POPULARITY_ALPHA` (0.6) lives in `server/utils/recommender.ts`. `npm run evaluate` hides one liked movie per user (684 users with at least five likes), recommends from the rest and reports how often the hidden movie lands in the top 5 (hit@5), next to a most-popular baseline:

```
most-popular baseline hit@5: 0.487
alpha 0.500  hit@5: 0.545
alpha 0.600  hit@5: 0.504  <- POPULARITY_ALPHA
alpha 0.800  hit@5: 0.406
```

To sweep your own values: `npm run evaluate -- 0.55 0.6 0.65`. The honest read is that personalisation is modest over a popular-only list on 70 mostly mainstream titles; the damping is a trade between accuracy and results that feel personal.

## API

- `GET /api/movies` returns the 70 movies with title, year, poster URL, blurhash, overview and genres, sorted by title. Per-user histories are not exposed here.
- `GET /api/profiles` returns the four demo profiles (`id`, `name`, `avatarUrl`, `tint`, `language`, `liked`). Their likes are read from the first four dataset users; the other 802 users stay private.
- `POST /api/recommendations` with `{ "liked": [20, 59, 60], "limit": 10 }` returns `{ source: "personalized" | "popular", items: [{ movie, score, because }] }`. Unknown ids give 400, a body that fails the schema gives 422.

## Regenerating the catalog

Posters, overviews and genres come from [TMDB](https://www.themoviedb.org/) and are resolved once into the committed `server/assets/catalog.json`. The running app and the tests do not need a key; you only need one to regenerate it.

1. Create a free TMDB account and an API credential (https://www.themoviedb.org/settings/api).
2. Copy `.env.example` to `.env` and fill in `TMDB_READ_ACCESS_TOKEN` (preferred, sent as a Bearer token) or `TMDB_API_KEY`. `.env` is gitignored.
3. Run `npm run build-catalog`. Titles are matched by title and year; known mismatches are handled by the `OVERRIDES` map in `scripts/build-catalog.ts`. The script exits non-zero and lists any title it cannot resolve. Each poster is downloaded once to compute its blurhash and then discarded; only the TMDB poster path is stored.

Options: `npm run build-catalog -- --out catalog.json --movies movies.json`.

## Look and feel

The theme follows rusticit.com: charcoal `#0e152e` and off-white surfaces, purple `#4a4ac0` / `#6f6fbe` as primary, cyan `#07c6ff` as a sparing accent, Rubik headings and Inter body text (self-hosted through `@nuxt/fonts`). It is defined once as a Vuetify theme in `vuetify.config.ts`, so components inherit it. Light and dark follow the system preference until the visitor uses the toggle in the header; that choice is kept in a cookie. All user-facing strings live in `i18n/locales/en.json`.

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB. Movie metadata and posters are provided by TMDB, whose logo and notice appear in the footer. TMDB's free tier is for non-commercial use.

Movie titles and likes come from the supplied MovieLens-style dataset in `server/assets/movies.json`.

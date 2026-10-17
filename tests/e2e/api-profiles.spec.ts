import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { $fetch, fetch, setup } from '@nuxt/test-utils/e2e'
import type { Movie, Profile } from '../../shared/types'

const dataset = JSON.parse(readFileSync('server/assets/movies.json', 'utf8')) as { users: { user_id: number, movies: number[] }[] }

describe('GET /api/profiles', async () => {
  await setup()

  it('returns exactly the four demo profiles with the Profile shape', async () => {
    const profiles = await $fetch<Profile[]>('/api/profiles')
    expect(profiles.map(profile => profile.id)).toEqual(['sam', 'yuki', 'lucia', 'dale'])
    for (const profile of profiles) {
      expect(Object.keys(profile).sort()).toEqual(['avatarUrl', 'id', 'language', 'liked', 'name', 'tint'])
      expect(profile).toMatchObject({
        name: expect.stringMatching(/\S/),
        tint: expect.stringMatching(/^#[0-9a-f]{6}$/i),
        avatarUrl: `/users/${profile.id}.png`
      })
    }
  })

  it('only uses the supported languages', async () => {
    const profiles = await $fetch<Profile[]>('/api/profiles')
    expect(profiles.map(profile => profile.language)).toEqual(['en', 'ja', 'es', 'en'])
  })

  it('reads each profile\'s likes from its dataset user, and every one is in the catalog', async () => {
    const [profiles, movies] = await Promise.all([$fetch<Profile[]>('/api/profiles'), $fetch<Movie[]>('/api/movies')])
    const catalog = new Set(movies.map(movie => movie.id))
    profiles.forEach((profile, index) => {
      const user = dataset.users[index]!
      expect(user.user_id).toBe(index + 1)
      expect(profile.liked).toEqual(user.movies)
      expect(profile.liked.every(id => catalog.has(id))).toBe(true)
    })
    expect(profiles.map(profile => profile.liked.length)).toEqual([8, 35, 45, 53])
  })

  it('does not expose any other user\'s data', async () => {
    const body = JSON.stringify(await $fetch('/api/profiles'))
    expect(body).not.toContain('user_id')
    expect(body).not.toContain('"users"')
    expect(JSON.parse(body)).toHaveLength(4)
  })

  it('serves every avatar', async () => {
    const profiles = await $fetch<Profile[]>('/api/profiles')
    for (const profile of profiles) {
      const response = await fetch(profile.avatarUrl)
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('image/png')
    }
  })
})

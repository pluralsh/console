import { beforeEach, describe, expect, it, vi } from 'vitest'

const AUTH_TOKEN = 'auth-token-v3'
const storage = new Map<string, string>()
const localStorageMock = {
  clear: () => storage.clear(),
  getItem: (key: string) => storage.get(key) ?? null,
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
  get length() {
    return storage.size
  },
  removeItem: (key: string) => storage.delete(key),
  setItem: (key: string, value: string) => storage.set(key, value),
} as Storage

async function loadAuth() {
  vi.resetModules()
  return import('./auth')
}

describe('auth storage', () => {
  beforeEach(() => {
    storage.clear()
    vi.stubGlobal('localStorage', localStorageMock)
  })

  it('persists encrypted auth tokens with the v3 storage engine', async () => {
    const { fetchToken, setToken } = await loadAuth()

    setToken('token')

    expect(fetchToken()).toBe('token')
    expect(localStorage.getItem(AUTH_TOKEN)).not.toBeNull()
  })

  it('removes the auth token when given an empty value', async () => {
    const { fetchToken, setToken } = await loadAuth()
    setToken('token')

    setToken(null)

    expect(fetchToken()).toBeUndefined()
    expect(localStorage.getItem(AUTH_TOKEN)).toBeNull()
  })

  it('expires legacy encrypted auth tokens during the v3 migration', async () => {
    localStorage.setItem('auth-token', 'legacy-ciphertext')

    const { fetchToken } = await loadAuth()

    expect(fetchToken()).toBeUndefined()
    expect(localStorage.getItem('auth-token')).toBeNull()
  })

  it('expires incompatible v3 auth tokens', async () => {
    localStorage.setItem(AUTH_TOKEN, 'incompatible-ciphertext')

    const { fetchToken } = await loadAuth()

    expect(fetchToken()).toBeUndefined()
    expect(localStorage.getItem(AUTH_TOKEN)).toBeNull()
  })
})

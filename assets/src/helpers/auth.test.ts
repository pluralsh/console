import { beforeEach, describe, expect, it, vi } from 'vitest'

const AUTH_STORAGE_VERSION_KEY = 'auth-storage-version'
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
    expect(localStorage.getItem(AUTH_STORAGE_VERSION_KEY)).toBe('3')
  })

  it('expires legacy encrypted auth tokens during the v3 migration', async () => {
    const initialAuth = await loadAuth()
    initialAuth.setToken('legacy-token')
    localStorage.removeItem(AUTH_STORAGE_VERSION_KEY)

    const { fetchToken } = await loadAuth()

    expect(fetchToken()).toBeUndefined()
  })
})

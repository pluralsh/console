import Cookies from 'js-cookie'

import { EncryptStorage } from 'encrypt-storage'

export const AUTH_TOKEN = 'auth-token-v3'
export const REFRESH_TOKEN = 'refresh-token-v3'
export const CHALLENGE_KEY = 'oauth-challenge'

// TODO: Remove this legacy cleanup after the v3 auth storage migration rollout is complete.
const LEGACY_REFRESH_TOKEN = 'refresh-token'
const legacyLocalStorageKeys = [
  'auth-token',
  'impersonation-original-auth-token',
  'impersonation-original-refresh-token',
  'impersonation-original-user-label',
  'auth-storage-version',
]

const { MODE, VITE_DEV_SECRET_KEY, VITE_PROD_SECRET_KEY } = import.meta.env
const secretKey =
  MODE === 'production'
    ? VITE_PROD_SECRET_KEY
    : MODE === 'test'
      ? '1234567890'
      : VITE_DEV_SECRET_KEY
const encryptStorage = EncryptStorage.create(secretKey, { engine: 'noble' })

legacyLocalStorageKeys.forEach((key) => localStorage.removeItem(key))
Cookies.remove(LEGACY_REFRESH_TOKEN, { path: '/' })

export function getEncryptedAuthValue(key: string) {
  try {
    return encryptStorage.getItem(key)
  } catch {
    localStorage.removeItem(key)

    return undefined
  }
}

export function wipeToken() {
  encryptStorage.removeItem(AUTH_TOKEN)
}

export function fetchToken() {
  return getEncryptedAuthValue(AUTH_TOKEN)
}

export function setToken(token: string | null | undefined) {
  if (token) {
    encryptStorage.setItem(AUTH_TOKEN, token)
  } else {
    wipeToken()
  }
}

export function setEncryptedAuthValue(
  key: string,
  value: string | null | undefined
) {
  encryptStorage.setItem(key, value || '')
}

export function removeEncryptedAuthValue(key: string) {
  encryptStorage.removeItem(key)
}

export const saveChallenge = (challenge) =>
  localStorage.setItem(CHALLENGE_KEY, challenge)
export const getChallenge = () => localStorage.getItem(CHALLENGE_KEY)
export const wipeChallenge = () => localStorage.removeItem(CHALLENGE_KEY)

export function setRefreshToken(token: string | null | undefined) {
  Cookies.set(REFRESH_TOKEN, token || '', {
    path: '/',
    secure: true,
    sameSite: 'strict',
    expires: 30,
  })
}

export function setRefreshTokenForStorage(token: string | null | undefined) {
  if (token) {
    setRefreshToken(token)
  } else {
    wipeRefreshToken()
  }
}

export function wipeRefreshToken() {
  Cookies.remove(REFRESH_TOKEN, { path: '/' })
}

export function fetchRefreshToken() {
  return Cookies.get(REFRESH_TOKEN)
}

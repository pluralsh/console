import Cookies from 'js-cookie'

import { EncryptStorage } from 'encrypt-storage'

export const AUTH_TOKEN = 'auth-token'
export const REFRESH_TOKEN = 'refresh-token'
export const CHALLENGE_KEY = 'oauth-challenge'

const { MODE, VITE_DEV_SECRET_KEY, VITE_PROD_SECRET_KEY } = import.meta.env
const secretKey =
  MODE === 'production'
    ? VITE_PROD_SECRET_KEY
    : MODE === 'test'
      ? '1234567890'
      : VITE_DEV_SECRET_KEY
const encryptStorage = new EncryptStorage(secretKey)

export function wipeToken() {
  encryptStorage.removeItem(AUTH_TOKEN)
}

export function fetchToken() {
  return encryptStorage.getItem(AUTH_TOKEN)
}

export function setToken(token: string | null | undefined) {
  encryptStorage.setItem(AUTH_TOKEN, token || '')
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

export function wipeRefreshToken() {
  Cookies.remove(REFRESH_TOKEN)
}

export function fetchRefreshToken() {
  return Cookies.get(REFRESH_TOKEN)
}

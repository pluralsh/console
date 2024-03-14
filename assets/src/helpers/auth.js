import Cookies from 'js-cookie'

export const AUTH_TOKEN = 'auth-token'
export const REFRESH_TOKEN = 'refresh-token'

export function wipeToken() {
  localStorage.removeItem(AUTH_TOKEN)
}

export function fetchToken() {
  return localStorage.getItem(AUTH_TOKEN)
}

export function setToken(token) {
  localStorage.setItem(AUTH_TOKEN, token || '')
}

export function setRefreshToken(token) {
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

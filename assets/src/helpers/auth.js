export const AUTH_TOKEN = 'watchman-token'
export const REFRESH_TOKEN = 'refresh-token'

export function wipeToken() {
  localStorage.removeItem(AUTH_TOKEN)
}

export function fetchToken() {
  return localStorage.getItem(AUTH_TOKEN)
}

export function setToken(token) {
  localStorage.setItem(AUTH_TOKEN, token)
}

export function setRefreshToken(token) {
  document.cookie = `${REFRESH_TOKEN}=${
    token || ''
  }; path=/; secure; samesite=strict; expires=${new Date(
    !token ? 0 : Date.now() + 365 * 24 * 60 * 60 * 1000
  ).toUTCString()}`
  console.log('setRefreshToken', token)
}

export function wipeRefreshToken() {
  console.log('wipeRefreshToken')
  setRefreshToken('')
}

export function fetchRefreshToken() {
  const refreshToken = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${REFRESH_TOKEN}=`))
    ?.split('=')[1]

  return refreshToken
}

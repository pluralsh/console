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
  }; path=/; secure; samesite=strict${
    !token ? '; expires=Thu, 01 Jan 1970 00:00:00 UTC' : ''
  }}`
}

export function wipeRefreshToken() {
  setRefreshToken('')
}

export function fetchRefreshToken() {
  const refreshToken = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${REFRESH_TOKEN}=`))
    ?.split('=')[1]

  return refreshToken
}

import {
  fetchRefreshToken,
  fetchToken,
  getEncryptedAuthValue,
  removeEncryptedAuthValue,
  setEncryptedAuthValue,
  setRefreshTokenForStorage,
  setToken,
} from './auth'

const ORIGINAL_AUTH_TOKEN_KEY = 'impersonation-original-auth-token'
const ORIGINAL_REFRESH_TOKEN_KEY = 'impersonation-original-refresh-token'
const ORIGINAL_USER_LABEL_KEY = 'impersonation-original-user-label'

export function isImpersonatingServiceAccount() {
  return !!getEncryptedAuthValue(ORIGINAL_AUTH_TOKEN_KEY)
}

export function getOriginalUserLabel() {
  return getEncryptedAuthValue(ORIGINAL_USER_LABEL_KEY)
}

export function startServiceAccountImpersonation(
  token: string,
  originalUserLabel?: Nullable<string>
) {
  if (!isImpersonatingServiceAccount()) {
    setEncryptedAuthValue(ORIGINAL_AUTH_TOKEN_KEY, fetchToken())
    setEncryptedAuthValue(ORIGINAL_REFRESH_TOKEN_KEY, fetchRefreshToken())
    setEncryptedAuthValue(ORIGINAL_USER_LABEL_KEY, originalUserLabel)
  }

  setToken(token)
  setRefreshTokenForStorage(null)
}

export function stopServiceAccountImpersonation() {
  const originalToken = getEncryptedAuthValue(ORIGINAL_AUTH_TOKEN_KEY)
  const originalRefreshToken = getEncryptedAuthValue(ORIGINAL_REFRESH_TOKEN_KEY)

  setToken(originalToken)
  setRefreshTokenForStorage(originalRefreshToken)
  clearServiceAccountImpersonation()
}

export function clearServiceAccountImpersonation() {
  removeEncryptedAuthValue(ORIGINAL_AUTH_TOKEN_KEY)
  removeEncryptedAuthValue(ORIGINAL_REFRESH_TOKEN_KEY)
  removeEncryptedAuthValue(ORIGINAL_USER_LABEL_KEY)
}

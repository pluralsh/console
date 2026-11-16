import dayjs from 'dayjs'
import {
  AgentCredentialFragment,
  AgentCredentialStatus,
} from 'generated/graphql'

export const CLAUDE_TOKEN_PREFIX = 'sk-ant-oat01-'

export function validateClaudeToken(token: string): Nullable<string> {
  const t = token.trim()
  if (!t) return 'Paste the token from `claude setup-token`'
  if (!t.startsWith(CLAUDE_TOKEN_PREFIX))
    return `Claude plan tokens start with ${CLAUDE_TOKEN_PREFIX}`
  if (/\s/.test(t)) return 'The token has whitespace in it; copy it again'
  return null
}

// mirrors console's shape check so obvious mistakes fail before upload
export function validateCodexAuthJson(text: string): Nullable<string> {
  let parsed: any
  try {
    parsed = JSON.parse(text)
  } catch {
    return "This isn't valid JSON; upload Codex's auth.json"
  }
  if (parsed?.auth_mode !== 'chatgpt')
    return 'auth_mode must be "chatgpt"; API-key logins go through the Plural AI proxy'
  if (!parsed?.tokens?.refresh_token)
    return 'This auth.json has no refresh token; log in again with a dedicated CODEX_HOME'
  return null
}

export function validateCodexAccessToken(token: string): Nullable<string> {
  if (!token.trim()) return 'Paste the access token'
  if (/\s/.test(token.trim())) return 'The token has whitespace in it'
  return null
}

export const ACCESS_TOKEN_EXPIRY_DAYS = [7, 30, 60, 90]

export type CredentialWarning = {
  severity: 'warning' | 'danger'
  message: string
}

export function credentialWarning(
  credential: Pick<
    AgentCredentialFragment,
    'status' | 'expiresAt' | 'failureCount'
  >,
  now: Date = new Date()
): Nullable<CredentialWarning> {
  if (credential.status === AgentCredentialStatus.Invalid)
    return {
      severity: 'danger',
      message: 'Rejected by the provider; relink it',
    }
  if (credential.status === AgentCredentialStatus.Expired)
    return { severity: 'danger', message: 'Expired; relink it' }
  if (!credential.expiresAt) return null
  const days = dayjs(credential.expiresAt).diff(now, 'day')
  if (days < 0) return { severity: 'danger', message: 'Expired; relink it' }
  if (days <= 7)
    return {
      severity: 'danger',
      message: `Expires in ${days} day${days === 1 ? '' : 's'}`,
    }
  if (days <= 30)
    return { severity: 'warning', message: `Expires in ${days} days` }
  return null
}

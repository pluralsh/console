import { AgentCredentialStatus } from 'generated/graphql'
import { describe, expect, it } from 'vitest'

import {
  credentialWarning,
  validateClaudeToken,
  validateCodexAuthJson,
} from './aiSubscriptionValidation'

const NOW = new Date('2026-11-14T00:00:00Z')

describe('aiSubscriptionValidation', () => {
  it('checks the Claude setup-token shape', () => {
    expect(validateClaudeToken('')).toMatch(/claude setup-token/)
    expect(validateClaudeToken('sk-ant-api03-x')).toMatch(/start with/)
    expect(validateClaudeToken(' sk-ant-oat01-abc ')).toBeNull()
  })

  it('only accepts ChatGPT-mode Codex auth.json with a refresh token', () => {
    expect(validateCodexAuthJson('{')).toMatch(/valid JSON/)
    expect(validateCodexAuthJson('{"auth_mode":"apikey"}')).toMatch(/chatgpt/)
    expect(
      validateCodexAuthJson('{"auth_mode":"chatgpt","tokens":{}}')
    ).toMatch(/refresh token/)
    expect(
      validateCodexAuthJson(
        '{"auth_mode":"chatgpt","tokens":{"refresh_token":"r"}}'
      )
    ).toBeNull()
  })

  it('warns about invalid and soon-expiring credentials', () => {
    expect(
      credentialWarning({ status: AgentCredentialStatus.Invalid }, NOW)
        ?.severity
    ).toBe('danger')
    expect(
      credentialWarning(
        {
          status: AgentCredentialStatus.Valid,
          expiresAt: '2026-11-17T00:00:00Z',
        },
        NOW
      )
    ).toEqual({ severity: 'danger', message: 'Expires in 3 days' })
    expect(
      credentialWarning(
        {
          status: AgentCredentialStatus.Valid,
          expiresAt: '2026-12-04T00:00:00Z',
        },
        NOW
      )?.severity
    ).toBe('warning')
    expect(
      credentialWarning(
        {
          status: AgentCredentialStatus.Valid,
          expiresAt: '2027-06-01T00:00:00Z',
        },
        NOW
      )
    ).toBeNull()
  })
})

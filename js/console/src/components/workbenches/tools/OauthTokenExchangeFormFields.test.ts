import { OauthTokenExchangeType } from 'generated/graphql'
import { describe, expect, it } from 'vitest'

import { oauthTokenExchangeIsComplete } from './OauthTokenExchangeFormFields'

const base = {
  enabled: true,
  tokenUrl: 'https://identity.example.com/oauth2/token',
  clientId: 'client-id',
}

describe('oauthTokenExchangeIsComplete', () => {
  it('allows disabled or unconfigured token exchange', () => {
    expect(oauthTokenExchangeIsComplete(undefined)).toBe(true)
    expect(oauthTokenExchangeIsComplete({ enabled: false })).toBe(true)
  })

  it('requires the token endpoint and client ID when enabled', () => {
    expect(
      oauthTokenExchangeIsComplete({
        enabled: true,
        type: OauthTokenExchangeType.ClientSecret,
        clientSecret: 'secret',
      })
    ).toBe(false)
  })

  it('requires a client secret for new client secret configuration', () => {
    expect(
      oauthTokenExchangeIsComplete({
        ...base,
        type: OauthTokenExchangeType.ClientSecret,
      })
    ).toBe(false)
    expect(
      oauthTokenExchangeIsComplete({
        ...base,
        type: OauthTokenExchangeType.ClientSecret,
        clientSecret: 'secret',
      })
    ).toBe(true)
  })

  it('preserves a stored credential only for the same authentication type', () => {
    expect(
      oauthTokenExchangeIsComplete(
        { ...base, type: OauthTokenExchangeType.ClientSecret },
        OauthTokenExchangeType.ClientSecret
      )
    ).toBe(true)
    expect(
      oauthTokenExchangeIsComplete(
        { ...base, type: OauthTokenExchangeType.ClientAssertion },
        OauthTokenExchangeType.ClientSecret
      )
    ).toBe(false)
  })

  it('requires a private key for a new client assertion', () => {
    expect(
      oauthTokenExchangeIsComplete({
        ...base,
        type: OauthTokenExchangeType.ClientAssertion,
        privateKey: '-----BEGIN PRIVATE KEY-----',
      })
    ).toBe(true)
  })
})

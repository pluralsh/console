import { describe, expect, it } from 'vitest'

import { MAX_TIMEOUT_RETRIES, shouldRetryRequest } from './retryPolicy'

const serverError = (statusCode: number) =>
  Object.assign(new Error(`status ${statusCode}`), { statusCode })

const authed = { authenticated: true }

describe('shouldRetryRequest', () => {
  it('keeps retrying transient failures like dropped connections and restarting pods', () => {
    for (const error of [
      new TypeError('Failed to fetch'),
      serverError(502),
      serverError(503),
    ])
      expect(shouldRetryRequest(100, error, authed)).toBe(true)
  })

  it('retries timeouts only a small, finite number of times', () => {
    for (const status of [408, 504, 524]) {
      const error = serverError(status)
      expect(shouldRetryRequest(1, error, authed)).toBe(true)
      expect(shouldRetryRequest(MAX_TIMEOUT_RETRIES, error, authed)).toBe(true)
      expect(shouldRetryRequest(MAX_TIMEOUT_RETRIES + 1, error, authed)).toBe(
        false
      )
    }
  })

  it('respects auth and per-operation opt-outs', () => {
    const error = serverError(502)
    expect(shouldRetryRequest(1, error, { authenticated: false })).toBe(false)
    expect(shouldRetryRequest(1, error, { ...authed, noRetry: true })).toBe(
      false
    )
    expect(shouldRetryRequest(1, undefined, authed)).toBe(false)
  })
})

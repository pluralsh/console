import { describe, expect, it } from 'vitest'
import { devboxSizing } from './devboxSizing'

describe('devboxSizing', () => {
  it('joins the per-instance resources', () => {
    expect(devboxSizing({ cpu: '2', memory: '4Gi', disk: '20Gi' })).toBe(
      '2 CPU · 4Gi · 20Gi disk'
    )
  })

  it('skips missing resources', () => {
    expect(devboxSizing({ memory: '8Gi' })).toBe('8Gi')
  })

  it('is empty without resources', () => {
    expect(devboxSizing(null)).toBeNull()
    expect(devboxSizing({})).toBeNull()
  })
})

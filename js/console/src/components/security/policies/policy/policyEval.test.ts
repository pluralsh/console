import { describe, expect, it } from 'vitest'
import { PolicyType } from 'generated/graphql'
import { getPolicyEvalDecision, isPolicyEvalDenied } from './policyEval'

describe('getPolicyEvalDecision', () => {
  it('labels workbench and stack denials', () => {
    const decision = getPolicyEvalDecision({
      deny: [{ message: 'blocked' }],
    })

    expect(isPolicyEvalDenied({ deny: [{ message: 'blocked' }] })).toBe(true)
    expect(decision).toMatchObject({
      filterKey: 'deny',
      label: 'Deny',
      severity: 'danger',
      reason: 'blocked',
    })
  })

  it('labels empty deny as allow', () => {
    expect(getPolicyEvalDecision({ deny: [] })).toMatchObject({
      filterKey: 'allow',
      label: 'Allow',
      severity: 'success',
    })
  })

  it('labels binding bind:true as match', () => {
    expect(
      getPolicyEvalDecision({ bind: true, sample: 0.5 }, PolicyType.Binding)
    ).toMatchObject({
      filterKey: 'match',
      label: 'Match',
      severity: 'success',
      reason: 'Matched by policy.',
    })
  })

  it('labels binding bind:false as no match, not allow', () => {
    const output = { bind: false, sample: 0.5 }

    expect(isPolicyEvalDenied(output)).toBe(false)
    expect(getPolicyEvalDecision(output, PolicyType.Binding)).toMatchObject({
      filterKey: 'no-match',
      label: 'No match',
      severity: 'neutral',
      reason: 'Did not match this binding policy.',
    })
  })

  it('treats a bind boolean as binding even without a policy type', () => {
    expect(getPolicyEvalDecision({ bind: false }).label).toBe('No match')
    expect(getPolicyEvalDecision({ bind: true }).label).toBe('Match')
  })
})

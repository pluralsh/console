import { DevboxAutonomy, DevboxConfigOptionFragment } from 'generated/graphql'
import { describe, expect, it } from 'vitest'
import { autonomyChoices, defaultAutonomy } from './devboxAutonomy'

const option = (...values: string[]): DevboxConfigOptionFragment => ({
  configId: 'autonomy',
  category: 'autonomy',
  options: values.map((value) => ({ value })),
})

describe('autonomyChoices', () => {
  it('marks levels above the max and levels the agent lacks', () => {
    const choices = autonomyChoices(option('manual', 'full'), {
      max: DevboxAutonomy.Auto,
    })
    expect(choices.map((c) => [c.value, c.unavailable])).toEqual([
      ['manual', undefined],
      ['auto', 'This agent or model has no reviewer for auto yet'],
      ['full', "Above this box's max of auto"],
    ])
  })
})

describe('defaultAutonomy', () => {
  it('lowers the box default to what the agent offers', () => {
    const policy = { default: DevboxAutonomy.Auto, max: DevboxAutonomy.Full }
    expect(defaultAutonomy(option('manual', 'auto', 'full'), policy)).toBe(
      'auto'
    )
    expect(defaultAutonomy(option('manual', 'full'), policy)).toBe('manual')
    expect(defaultAutonomy(option('full'), policy)).toBe('full')
  })

  it('skips auto on proxy billing', () => {
    const policy = { default: DevboxAutonomy.Auto, max: DevboxAutonomy.Full }
    const all = option('manual', 'auto', 'full')
    expect(autonomyChoices(all, policy, true)[1].unavailable).toBe(
      'Needs subscription billing, or AI enabled in settings'
    )
    expect(defaultAutonomy(all, policy, true)).toBe('manual')
  })

  it('has no default when nothing is allowed', () => {
    expect(
      defaultAutonomy(option('full'), { max: DevboxAutonomy.Auto })
    ).toBeNull()
  })
})

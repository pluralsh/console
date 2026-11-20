import {
  AiProvider,
  DevboxAgentFragment,
  DevboxAgentType,
  DevboxBillingMode,
  DevboxProbeStatus,
  DevboxStatus,
} from 'generated/graphql'
import { describe, expect, it } from 'vitest'

import {
  billedToProxy,
  DevboxStartBox,
  defaultStartValues,
  dropProxyAuto,
  hasStartErrors,
  modelDisplayName,
  proxyModelOf,
  reconcileStartValues,
  toInstanceAttributes,
  validateStartValues,
} from './devboxStartForm'

const claude: DevboxAgentFragment = {
  type: DevboxAgentType.Claude,
  default: true,
  probeStatus: DevboxProbeStatus.Ok,
  defaultModel: 'sonnet',
  models: [
    { id: 'sonnet', name: 'Sonnet' },
    { id: 'opus', name: 'Opus' },
  ],
} as DevboxAgentFragment

const codex: DevboxAgentFragment = {
  type: DevboxAgentType.Codex,
  probeStatus: DevboxProbeStatus.Missing,
  models: [],
} as DevboxAgentFragment

const box: DevboxStartBox = {
  id: 'box-1',
  name: 'web',
  status: DevboxStatus.Ready,
  allowedRepositories: ['https://github.com/acme/web.git'],
  agents: [claude, codex],
}

describe('devbox start form', () => {
  it('defaults to the catalog default agent, model and allowed repos', () => {
    const values = defaultStartValues(box, [
      'git@github.com:acme/web.git',
      'https://github.com/acme/other',
    ])
    expect(values).toMatchObject({
      devboxId: 'box-1',
      agent: DevboxAgentType.Claude,
      model: 'sonnet',
      repositories: ['git@github.com:acme/web.git'],
    })
    expect(hasStartErrors(validateStartValues(values, box))).toBe(false)
  })

  it('drops a picked auto autonomy once the agent bills to the proxy', () => {
    const values = {
      ...defaultStartValues(box, []),
      configOptions: { autonomy: 'auto', effort: 'auto' },
      billing: { [DevboxAgentType.Claude]: 'subscription' as const },
    }
    expect(dropProxyAuto(values, 'autonomy')).toBe(values)
    const proxied = dropProxyAuto(
      { ...values, billing: { [DevboxAgentType.Claude]: 'proxy' as const } },
      'autonomy'
    )
    expect(proxied.configOptions).toEqual({ effort: 'auto' })
    expect(
      dropProxyAuto(
        { ...values, billing: { [DevboxAgentType.Claude]: 'proxy' as const } },
        'autonomy',
        null,
        true
      ).configOptions
    ).toEqual({ autonomy: 'auto', effort: 'auto' })
    expect(
      billedToProxy(
        { ...values, billing: {} },
        { [DevboxAgentType.Claude]: 'subscription' }
      )
    ).toBe(false)
  })

  it('requires a box unless restoring a snapshot', () => {
    const values = defaultStartValues(null, [])
    expect(validateStartValues(values, null).devboxId).toBe('Pick a box')
    expect(
      validateStartValues({ ...values, snapshotId: 'snap' }, null)
    ).toEqual({})
  })

  it('rejects agents, models and repos outside the catalog', () => {
    const values = defaultStartValues(box, [])
    expect(
      validateStartValues({ ...values, model: 'gpt-5' }, box).model
    ).toMatch(/isn't in the agent's catalog/)
    expect(
      validateStartValues({ ...values, agent: DevboxAgentType.Gemini }, box)
        .agent
    ).toMatch(/doesn't offer/)
    expect(
      validateStartValues({ ...values, agent: DevboxAgentType.Codex }, box)
        .agent
    ).toMatch(/isn't installed/)
    expect(
      validateStartValues(
        { ...values, repositories: ['https://github.com/acme/other'] },
        box
      ).repositories
    ).toMatch(/Not allowed/)
    expect(
      validateStartValues(values, { ...box, status: DevboxStatus.Pending })
        .devboxId
    ).toMatch(/isn't ready/)
  })

  it('re-derives agent and model when the box changes', () => {
    const values = {
      ...defaultStartValues(box, []),
      model: 'opus',
    }
    const other: DevboxStartBox = {
      id: 'box-2',
      name: 'api',
      agents: [{ ...codex, probeStatus: DevboxProbeStatus.Ok, default: true }],
    }
    expect(reconcileStartValues(values, box).model).toBe('opus')
    expect(reconcileStartValues(values, other)).toMatchObject({
      devboxId: 'box-2',
      agent: DevboxAgentType.Codex,
      model: null,
    })
  })

  it('maps values to instance attributes with per-agent billing', () => {
    expect(
      toInstanceAttributes({
        ...defaultStartValues(box, []),
        name: '  my box ',
        configOptions: { effort: 'high', empty: '' },
        billing: {
          [DevboxAgentType.Claude]: 'subscription',
          [DevboxAgentType.Codex]: 'proxy',
        },
      })
    ).toEqual({
      devboxId: 'box-1',
      name: 'my box',
      agent: DevboxAgentType.Claude,
      model: 'sonnet',
      repositories: [],
      configOptions: [{ configId: 'effort', value: 'high' }],
      agentBilling: [
        {
          agent: DevboxAgentType.Claude,
          billing: DevboxBillingMode.Subscription,
        },
        { agent: DevboxAgentType.Codex, billing: DevboxBillingMode.Proxy },
      ],
    })
  })
})

describe('modelDisplayName', () => {
  it('resolves an alias to the model it points at', () => {
    expect(
      modelDisplayName({
        id: 'default',
        name: 'Default (recommended)',
        description: 'Opus 4.5 · Most capable for complex work',
      })
    ).toBe('Opus 4.5')
    expect(
      modelDisplayName({
        id: 'default',
        name: 'Default (recommended)',
        description: 'Use the default model (currently Sonnet 4.5) · $3/$15',
      })
    ).toBe('Sonnet 4.5')
  })

  it('adds the version a named model describes', () => {
    expect(
      modelDisplayName({
        id: 'sonnet',
        name: 'Sonnet',
        description: 'Sonnet 4.5 · Best for everyday tasks',
      })
    ).toBe('Sonnet 4.5')
  })

  it('keeps names it cannot resolve', () => {
    expect(modelDisplayName({ id: 'gpt-5', name: 'GPT-5' })).toBe('GPT-5')
    expect(modelDisplayName({ id: 'default', name: 'Default' })).toBe('Default')
    expect(
      modelDisplayName({
        id: 'opus',
        name: 'Opus',
        description: 'For the hardest problems',
      })
    ).toBe('Opus')
  })

  it('shows a proxy model by its slug, not the alias it matched', () => {
    expect(
      modelDisplayName({
        id: 'bedrock/us.anthropic.claude-opus-4-5-v1:0',
        name: 'Opus',
        description: 'Opus 4.5 · Most capable',
      })
    ).toBe('us.anthropic.claude-opus-4-5-v1:0')
  })
})

describe('proxyModelOf', () => {
  it('splits an AI proxy id into provider and slug', () => {
    expect(proxyModelOf('openai/gpt-5')).toEqual({
      provider: AiProvider.Openai,
      slug: 'gpt-5',
    })
    expect(proxyModelOf('plural/anthropic/claude-sonnet-4-5')).toEqual({
      provider: AiProvider.Anthropic,
      slug: 'claude-sonnet-4-5',
    })
  })

  it('ignores agent aliases and unknown prefixes', () => {
    expect(proxyModelOf('opus')).toBeNull()
    expect(proxyModelOf('acme/model')).toBeNull()
    expect(proxyModelOf(null)).toBeNull()
  })
})

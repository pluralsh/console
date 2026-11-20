import {
  AiProvider,
  DevboxAgentFragment,
  DevboxAgentType,
  DevboxBillingMode,
  DevboxInstanceAttributes,
  DevboxProbeStatus,
  DevboxStatus,
} from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import {
  defaultAutonomy,
  DevboxAutonomyPolicy,
  isAutonomyOption,
} from './devboxAutonomy'

export type DevboxBilling = 'proxy' | 'subscription'

export type DevboxStartBox = {
  id: string
  name: string
  status?: Nullable<DevboxStatus>
  allowedRepositories?: Nullable<Nullable<string>[]>
  agents?: Nullable<Nullable<DevboxAgentFragment>[]>
  autonomy?: Nullable<DevboxAutonomyPolicy>
  // a decision model reviews permission requests at auto, so proxy billing doesn't rule auto out
  decisionReview?: Nullable<boolean>
}

export type DevboxStartValues = {
  devboxId: Nullable<string>
  snapshotId?: Nullable<string>
  name: string
  agent: Nullable<DevboxAgentType>
  model: Nullable<string>
  repositories: string[]
  configOptions: Record<string, string>
  billing: Partial<Record<DevboxAgentType, DevboxBilling>>
}

export type DevboxStartErrors = Partial<
  Record<'devboxId' | 'agent' | 'model' | 'repositories', string>
>

export const MODEL_CATEGORY = 'model'

export const normalizeRepoUrl = (url: string) =>
  url
    .trim()
    .toLowerCase()
    .replace(/^(https?:\/\/|ssh:\/\/|git@)/, '')
    .replace(/:(?!\d)/, '/')
    .replace(/\.git$/, '')
    .replace(/\/+$/, '')

export const agentsOf = (box: Nullable<DevboxStartBox>) =>
  (box?.agents ?? []).filter(isNonNullable)

export const findAgent = (
  box: Nullable<DevboxStartBox>,
  type: Nullable<DevboxAgentType>
) => agentsOf(box).find((a) => a.type === type)

export const defaultAgentOf = (box: Nullable<DevboxStartBox>) => {
  const agents = agentsOf(box)
  return agents.find((a) => a.default) ?? agents[0]
}

export const modelConfigOption = (agent: Nullable<DevboxAgentFragment>) =>
  agent?.configOptions?.find((o) => o?.category === MODEL_CATEGORY)

// the models offered under a billing: the AI proxy's, or on a subscription the
// probed models narrowed by the box's allowlist; the model config option's
// values when the catalog lists none
export function modelsOf(
  agent: Nullable<DevboxAgentFragment>,
  billing: DevboxBilling = 'proxy'
) {
  const models = (
    (billing === 'subscription' ? agent?.subscriptionModels : agent?.models) ??
    []
  ).filter(isNonNullable)
  const entries = models.length
    ? models.map(({ id, name, description }) => ({ id, name, description }))
    : (modelConfigOption(agent)?.options ?? [])
        .filter(isNonNullable)
        .map(({ value, name, description }) => ({
          id: value,
          name,
          description,
        }))
  // a proxy model's agent-side name and description describe the alias it was
  // matched to, not the model the proxy routes to
  return entries.map((m) =>
    proxyModelOf(m.id)
      ? { id: m.id, name: m.id, description: null }
      : { ...m, name: m.name ?? m.id }
  )
}

const PROXY_PROVIDERS: Record<string, AiProvider> = {
  anthropic: AiProvider.Anthropic,
  bedrock: AiProvider.Bedrock,
  vertex: AiProvider.Vertex,
  openai: AiProvider.Openai,
  'openai-compatible': AiProvider.OpenaiCompatible,
  azure: AiProvider.Azure,
  xai: AiProvider.Xai,
  ollama: AiProvider.Ollama,
}

// AI proxy model IDs are `provider/model`, with a `plural/` prefix under OpenCode
export function proxyModelOf(id: Nullable<string>) {
  const [prefix, ...rest] = (id ?? '').replace(/^plural\//, '').split('/')
  const provider = PROXY_PROVIDERS[prefix]
  return provider && rest.length ? { provider, slug: rest.join('/') } : null
}

// agents list aliases like Claude Code's "Default (recommended)", whose
// description leads with the model it resolves to, e.g. "Opus 4.5 · Most capable"
export function modelDisplayName(model: {
  id: string
  name?: Nullable<string>
  description?: Nullable<string>
}) {
  const proxy = proxyModelOf(model.id)
  if (proxy) return proxy.slug
  const name = model.name || model.id
  const description = model.description ?? ''
  const resolved = (
    description.match(/currently ([^)]+)\)/i)?.[1] ??
    description.split(' · ')[0]
  ).trim()
  const alias = /^default\b/i.test(name)
  const usable = !!resolved && resolved.length <= 32
  if (
    usable &&
    (alias || resolved.toLowerCase().startsWith(name.toLowerCase()))
  )
    return resolved
  return alias ? name.replace(/\s*\(recommended\)\s*$/i, '') : name
}

export function modelDisplayNameOf(
  agent: Nullable<DevboxAgentFragment>,
  id: Nullable<string>
) {
  if (!id) return null
  const model = [...modelsOf(agent), ...modelsOf(agent, 'subscription')].find(
    (m) => m.id === id
  )
  return model ? modelDisplayName(model) : (proxyModelOf(id)?.slug ?? id)
}

export function defaultModelOf(
  agent: Nullable<DevboxAgentFragment>,
  billing: DevboxBilling = 'proxy'
) {
  const models = modelsOf(agent, billing)
  const preferred = [
    billing === 'subscription'
      ? agent?.subscriptionDefaultModel
      : agent?.defaultModel,
    modelConfigOption(agent)?.currentValue,
  ]
  for (const id of preferred)
    if (id && (!models.length || models.some((m) => m.id === id))) return id
  return models[0]?.id ?? null
}

export function allowedRepositoriesFor(
  box: Nullable<DevboxStartBox>,
  candidates: string[]
) {
  const allowed = (box?.allowedRepositories ?? []).filter(isNonNullable)
  if (!allowed.length) return candidates
  const set = new Set(allowed.map(normalizeRepoUrl))
  return candidates.filter((r) => set.has(normalizeRepoUrl(r)))
}

const billingFor = (
  billing: DevboxStartValues['billing'],
  agent: Nullable<DevboxAgentType>
): DevboxBilling => (agent && billing[agent]) || 'proxy'

export function defaultStartValues(
  box: Nullable<DevboxStartBox>,
  workbenchRepositories: Nullable<Nullable<string>[]>,
  billing: DevboxStartValues['billing'] = {}
): DevboxStartValues {
  const agent = defaultAgentOf(box)
  return {
    devboxId: box?.id ?? null,
    name: '',
    agent: agent?.type ?? null,
    model: defaultModelOf(agent, billingFor(billing, agent?.type)),
    repositories: allowedRepositoriesFor(
      box,
      (workbenchRepositories ?? []).filter(isNonNullable)
    ),
    configOptions: {},
    billing,
  }
}

// re-derives the agent and model when the box changes, keeping valid choices
export function reconcileStartValues(
  values: DevboxStartValues,
  box: Nullable<DevboxStartBox>
): DevboxStartValues {
  const agent = findAgent(box, values.agent) ?? defaultAgentOf(box)
  const billing = billingFor(values.billing, agent?.type)
  const models = modelsOf(agent, billing)
  const model =
    values.model &&
    agent?.type === values.agent &&
    (!models.length || models.some((m) => m.id === values.model))
      ? values.model
      : defaultModelOf(agent, billing)
  return {
    ...values,
    devboxId: box?.id ?? null,
    agent: agent?.type ?? null,
    model,
    repositories: allowedRepositoriesFor(box, values.repositories),
  }
}

export function validateStartValues(
  values: DevboxStartValues,
  box: Nullable<DevboxStartBox>
): DevboxStartErrors {
  const errors: DevboxStartErrors = {}
  if (!box) {
    if (!values.snapshotId) errors.devboxId = 'Pick a box'
    return errors
  }
  if (box.status === DevboxStatus.Failed || box.status === DevboxStatus.Pending)
    errors.devboxId = `${box.name} isn't ready yet`

  const agent = findAgent(box, values.agent)
  if (!values.agent) errors.agent = 'Pick an agent'
  else if (!agent) errors.agent = `${box.name} doesn't offer this agent`
  else if (agent.probeStatus === DevboxProbeStatus.Missing)
    errors.agent = "This agent isn't installed in the box's image"
  else {
    const autonomy = agent.configOptions?.find(isAutonomyOption)
    if (autonomy && !defaultAutonomy(autonomy, box.autonomy))
      errors.agent = `This agent never asks for permission, so it needs ${box.name} to allow full autonomy`
  }

  const models = modelsOf(agent, billingFor(values.billing, values.agent))
  if (agent && models.length) {
    if (!values.model) errors.model = 'Pick a model'
    else if (!models.some((m) => m.id === values.model))
      errors.model = "This model isn't in the agent's catalog"
  }

  const allowed = (box.allowedRepositories ?? []).filter(isNonNullable)
  if (allowed.length) {
    const set = new Set(allowed.map(normalizeRepoUrl))
    const outside = values.repositories.filter(
      (r) => !set.has(normalizeRepoUrl(r))
    )
    if (outside.length)
      errors.repositories = `Not allowed on this box: ${outside.join(', ')}`
  }
  return errors
}

// whether the picked agent bills to the AI proxy, given the owner's default billing per agent
export function billedToProxy(
  values: DevboxStartValues,
  defaults?: Nullable<Partial<Record<DevboxAgentType, DevboxBilling>>>
): boolean {
  if (!values.agent) return true
  return (
    (values.billing[values.agent] ?? defaults?.[values.agent] ?? 'proxy') ===
    'proxy'
  )
}

export const instanceBilling = (
  instance: {
    agentBilling?: Nullable<
      Nullable<{
        agent?: Nullable<DevboxAgentType>
        billing?: Nullable<DevboxBillingMode>
      }>[]
    >
  },
  agent: Nullable<DevboxAgentType>
): DevboxBilling =>
  (instance.agentBilling ?? []).find((b) => b?.agent === agent)?.billing ===
  DevboxBillingMode.Subscription
    ? 'subscription'
    : 'proxy'

// whether a running instance's agent bills to the AI proxy, where its own reviewer can't run, so auto needs the
// box's decision model to review instead
export function isProxyBilled(
  instance: {
    devbox?: Nullable<{ decisionReview?: Nullable<unknown> }>
    agentBilling?: Nullable<
      Nullable<{
        agent?: Nullable<DevboxAgentType>
        billing?: Nullable<DevboxBillingMode>
      }>[]
    >
  },
  agent: Nullable<DevboxAgentType>
): boolean {
  return (
    !instance.devbox?.decisionReview &&
    (instance.agentBilling ?? []).find((b) => b?.agent === agent)?.billing !==
      DevboxBillingMode.Subscription
  )
}

// drops a picked auto autonomy once the agent bills to the AI proxy, unless a decision model reviews for it
export function dropProxyAuto(
  values: DevboxStartValues,
  autonomyId: Nullable<string>,
  defaults?: Nullable<Partial<Record<DevboxAgentType, DevboxBilling>>>,
  decisionReview?: Nullable<boolean>
): DevboxStartValues {
  if (
    decisionReview ||
    !autonomyId ||
    values.configOptions[autonomyId] !== 'auto' ||
    !billedToProxy(values, defaults)
  )
    return values
  const { [autonomyId]: _, ...configOptions } = values.configOptions
  return { ...values, configOptions }
}

export const hasStartErrors = (errors: DevboxStartErrors) =>
  Object.values(errors).some(Boolean)

export function toInstanceAttributes(
  values: DevboxStartValues
): DevboxInstanceAttributes {
  const configOptions = Object.entries(values.configOptions)
    .filter(([, value]) => !!value)
    .map(([configId, value]) => ({ configId, value }))
  const agentBilling = (
    Object.entries(values.billing) as [DevboxAgentType, DevboxBilling][]
  ).map(([agent, billing]) => ({
    agent,
    billing:
      billing === 'subscription'
        ? DevboxBillingMode.Subscription
        : DevboxBillingMode.Proxy,
  }))
  return {
    ...(values.devboxId ? { devboxId: values.devboxId } : {}),
    ...(values.snapshotId ? { snapshotId: values.snapshotId } : {}),
    ...(values.name.trim() ? { name: values.name.trim() } : {}),
    ...(values.agent ? { agent: values.agent } : {}),
    ...(values.model ? { model: values.model } : {}),
    repositories: values.repositories,
    ...(configOptions.length ? { configOptions } : {}),
    ...(agentBilling.length ? { agentBilling } : {}),
  }
}

export const AGENT_LABELS: Record<DevboxAgentType, string> = {
  [DevboxAgentType.Claude]: 'Claude Code',
  [DevboxAgentType.Codex]: 'Codex',
  [DevboxAgentType.Opencode]: 'OpenCode',
  [DevboxAgentType.Gemini]: 'Gemini CLI',
  [DevboxAgentType.Pi]: 'Pi',
}

export const agentLabel = (type: Nullable<DevboxAgentType>) =>
  type ? (AGENT_LABELS[type] ?? type) : 'Agent'

// v1 subscription plans: Claude plans power Claude Code, ChatGPT plans Codex
export const SUBSCRIPTION_PROVIDER: Partial<
  Record<DevboxAgentType, { provider: 'anthropic' | 'openai'; plan: string }>
> = {
  [DevboxAgentType.Claude]: { provider: 'anthropic', plan: 'Claude plan' },
  [DevboxAgentType.Codex]: { provider: 'openai', plan: 'ChatGPT plan' },
}

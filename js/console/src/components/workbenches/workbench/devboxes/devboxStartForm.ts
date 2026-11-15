import {
  DevboxAgentFragment,
  DevboxAgentType,
  DevboxBillingMode,
  DevboxInstanceAttributes,
  DevboxProbeStatus,
  DevboxStatus,
} from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'

export type DevboxBilling = 'proxy' | 'subscription'

export type DevboxStartBox = {
  id: string
  name: string
  status?: Nullable<DevboxStatus>
  allowedRepositories?: Nullable<Nullable<string>[]>
  agents?: Nullable<Nullable<DevboxAgentFragment>[]>
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

// the probed models narrowed by the box's allowlist; the model config option's
// values when the catalog lists none
export function modelsOf(agent: Nullable<DevboxAgentFragment>) {
  const models = (agent?.models ?? []).filter(isNonNullable)
  if (models.length)
    return models.map(({ id, name, description }) => ({
      id,
      name: name ?? id,
      description,
    }))
  return (modelConfigOption(agent)?.options ?? [])
    .filter(isNonNullable)
    .map(({ value, name, description }) => ({
      id: value,
      name: name ?? value,
      description,
    }))
}

export function defaultModelOf(agent: Nullable<DevboxAgentFragment>) {
  const models = modelsOf(agent)
  const preferred = [
    agent?.defaultModel,
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

export function defaultStartValues(
  box: Nullable<DevboxStartBox>,
  workbenchRepositories: Nullable<Nullable<string>[]>
): DevboxStartValues {
  const agent = defaultAgentOf(box)
  return {
    devboxId: box?.id ?? null,
    name: '',
    agent: agent?.type ?? null,
    model: defaultModelOf(agent),
    repositories: allowedRepositoriesFor(
      box,
      (workbenchRepositories ?? []).filter(isNonNullable)
    ),
    configOptions: {},
    billing: {},
  }
}

// re-derives the agent and model when the box changes, keeping valid choices
export function reconcileStartValues(
  values: DevboxStartValues,
  box: Nullable<DevboxStartBox>
): DevboxStartValues {
  const agent = findAgent(box, values.agent) ?? defaultAgentOf(box)
  const models = modelsOf(agent)
  const model =
    values.model &&
    agent?.type === values.agent &&
    (!models.length || models.some((m) => m.id === values.model))
      ? values.model
      : defaultModelOf(agent)
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

  const models = modelsOf(agent)
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

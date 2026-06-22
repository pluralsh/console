import {
  AiProvider,
  AiSettings,
  AiSettingsAttributes,
  ModelDefault,
} from 'generated/graphql'
import pick from 'lodash/pick'
import { providerSettingsKey } from './AISettingsProviderForm.tsx'

export const DEFAULT_MODEL_ROUTING_OPTION = 'default'

const modelRoutingStateKeys = [
  'provider',
  'toolProvider',
  'embeddingProvider',
] as const

export type ModelRoutingRole = 'chat' | 'embedding' | 'tool'

export const modelRoutingRoles = [
  'chat',
  'embedding',
  'tool',
] as const satisfies readonly ModelRoutingRole[]

export const modelRoutingRoleMeta = {
  chat: {
    title: 'Chat model',
    description: 'Used for low-compute chat and completion use cases.',
    providerField: 'provider',
    modelHint: 'Configured in the provider connection settings.',
  },
  embedding: {
    title: 'Embedding model',
    description:
      'Indexes Kubernetes and IaC state information for semantic search.',
    providerField: 'embeddingProvider',
    modelHint: 'Configured in the provider connection settings.',
  },
  tool: {
    title: 'Tool model',
    description: 'Used for complex agentic inference.',
    providerField: 'toolProvider',
    modelHint: 'Configured in the provider connection settings.',
  },
} as const satisfies Record<
  ModelRoutingRole,
  {
    title: string
    description: string
    providerField: keyof Pick<
      AiSettingsAttributes,
      'provider' | 'toolProvider' | 'embeddingProvider'
    >
    modelHint: string
  }
>

type ProviderConfigKey = (typeof providerSettingsKey)[AiProvider]
export type ModelDefaultsByProvider = Partial<Record<AiProvider, ModelDefault>>

type ModelFieldKey =
  | 'model'
  | 'toolModel'
  | 'embeddingModel'
  | 'modelId'
  | 'toolModelId'

export function modelFieldKeyFor(
  provider: AiProvider,
  role: ModelRoutingRole
): ModelFieldKey {
  if (provider === AiProvider.Bedrock) {
    switch (role) {
      case 'chat':
        return 'modelId'
      case 'tool':
        return 'toolModelId'
      default:
        return 'embeddingModel'
    }
  }

  switch (role) {
    case 'chat':
      return 'model'
    case 'tool':
      return 'toolModel'
    default:
      return 'embeddingModel'
  }
}

export type ModelRoutingState = Pick<
  AiSettings,
  (typeof modelRoutingStateKeys)[number]
>

export function initialModelRoutingState(
  ai: Nullable<AiSettings>
): ModelRoutingState {
  return { ...pick(ai ?? {}, modelRoutingStateKeys) }
}

export function selectedProviderForRole(
  role: ModelRoutingRole,
  routing: ModelRoutingState
): Nullable<AiProvider> {
  switch (role) {
    case 'chat':
      return routing.provider
    case 'tool':
      return routing.toolProvider
    default:
      return routing.embeddingProvider
  }
}

export function effectiveProviderForRole(
  role: ModelRoutingRole,
  routing: ModelRoutingState
): Nullable<AiProvider> {
  const selected = selectedProviderForRole(role, routing)
  if (selected) return selected

  return routing.provider
}

export function getModelValue(
  role: ModelRoutingRole,
  routing: ModelRoutingState,
  ai: Nullable<AiSettings>,
  modelDefaultsByProvider?: ModelDefaultsByProvider
): string {
  const provider = effectiveProviderForRole(role, routing)
  if (!provider) return DEFAULT_MODEL_ROUTING_OPTION

  const key = providerSettingsKey[provider]
  const field = modelFieldKeyFor(provider, role)
  const serverConfig = ai?.[key as ProviderConfigKey]
  const value = serverConfig?.[field as keyof NonNullable<typeof serverConfig>]
  if (typeof value === 'string' && value.trim()) return value

  const defaults = modelDefaultsByProvider?.[provider]
  const defaultValue = defaults?.[defaultModelFieldForRole(role)]
  return defaultValue?.trim() || DEFAULT_MODEL_ROUTING_OPTION
}

function defaultModelFieldForRole(
  role: ModelRoutingRole
): keyof Pick<ModelDefault, 'model' | 'toolModel' | 'embeddingModel'> {
  switch (role) {
    case 'tool':
      return 'toolModel'
    case 'embedding':
      return 'embeddingModel'
    default:
      return 'model'
  }
}

export function setRoutingProvider(
  role: ModelRoutingRole,
  provider: Nullable<AiProvider>,
  routing: ModelRoutingState
): ModelRoutingState {
  switch (role) {
    case 'chat':
      return provider ? { ...routing, provider } : routing
    case 'tool':
      return { ...routing, toolProvider: provider }
    default:
      return { ...routing, embeddingProvider: provider }
  }
}

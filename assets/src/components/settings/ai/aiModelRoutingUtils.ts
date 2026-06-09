import { AiProvider, AiSettings, AiSettingsAttributes } from 'generated/graphql'
import pick from 'lodash/pick'
import { providerSettingsKey } from './AISettingsProviderForm.tsx'

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
    description:
      'Powers conversations, fix-it suggestions, and post-incident summaries.',
    providerField: 'provider',
    modelHint: 'Leave blank to use the provider default model.',
  },
  embedding: {
    title: 'Embedding model',
    description: 'Used for embeddings and vector search.',
    providerField: 'embeddingProvider',
    modelHint: 'Leave blank to use the provider default embedding model.',
  },
  tool: {
    title: 'Tool model',
    description:
      'Indexes documents, code, and runbooks for retrieval. Re-indexes on change.',
    providerField: 'toolProvider',
    modelHint: 'Leave blank to use the provider default tool model.',
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

type ProviderSettings = Omit<AiSettingsAttributes, 'enabled' | 'provider'>
type ProviderConfigKey = (typeof providerSettingsKey)[AiProvider]

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
  providerSettings: ProviderSettings,
  ai: Nullable<AiSettings>
): string {
  const provider = effectiveProviderForRole(role, routing)
  if (!provider) return ''

  const key = providerSettingsKey[provider]
  const field = modelFieldKeyFor(provider, role)
  const fromState =
    providerSettings[key]?.[
      field as keyof (typeof providerSettings)[typeof key]
    ]
  if (typeof fromState === 'string') return fromState

  const serverConfig = ai?.[key as ProviderConfigKey]
  const fromServer =
    serverConfig?.[field as keyof NonNullable<typeof serverConfig>]
  return typeof fromServer === 'string' ? fromServer : ''
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

export function setModelValue(
  role: ModelRoutingRole,
  routing: ModelRoutingState,
  providerSettings: ProviderSettings,
  model: string
): ProviderSettings {
  const provider = effectiveProviderForRole(role, routing)
  if (!provider) return providerSettings

  const key = providerSettingsKey[provider]
  const field = modelFieldKeyFor(provider, role)

  const current = providerSettings[key]
  const currentObject = current && typeof current === 'object' ? current : {}

  return {
    ...providerSettings,
    [key]: {
      ...currentObject,
      [field]: model || null,
    },
  }
}

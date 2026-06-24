import {
  AiProvider,
  AiSettings,
  AiSettingsAttributes,
  ModelDefault,
} from 'generated/graphql'
import pick from 'lodash/pick'

export const DEFAULT_MODEL_ROUTING_OPTION = 'default'

type ModelDefaultField = keyof Pick<
  ModelDefault,
  'model' | 'toolModel' | 'embeddingModel'
>

const ModelDefaultField = {
  Model: 'model',
  ToolModel: 'toolModel',
  EmbeddingModel: 'embeddingModel',
} as const satisfies Record<string, ModelDefaultField>

export const ModelRoutingRole = {
  Chat: 'chat',
  Tool: 'tool',
  Embedding: 'embedding',
} as const

export type ModelRoutingRole =
  (typeof ModelRoutingRole)[keyof typeof ModelRoutingRole]

const modelDefaultFieldByRole = {
  [ModelRoutingRole.Chat]: ModelDefaultField.Model,
  [ModelRoutingRole.Tool]: ModelDefaultField.ToolModel,
  [ModelRoutingRole.Embedding]: ModelDefaultField.EmbeddingModel,
} as const satisfies Record<ModelRoutingRole, ModelDefaultField>

export const providerSettingsKey: Record<
  AiProvider,
  keyof Omit<AiSettingsAttributes, 'enabled' | 'provider'>
> = {
  [AiProvider.Openai]: 'openai',
  [AiProvider.OpenaiCompatible]: 'openaiCompatible',
  [AiProvider.Anthropic]: 'anthropic',
  [AiProvider.Bedrock]: 'bedrock',
  [AiProvider.Ollama]: 'ollama',
  [AiProvider.Azure]: 'azure',
  [AiProvider.Vertex]: 'vertex',
}

const modelRoutingStateKeys = [
  'provider',
  'toolProvider',
  'embeddingProvider',
] as const

export const modelRoutingRoles = [
  ModelRoutingRole.Chat,
  ModelRoutingRole.Embedding,
  ModelRoutingRole.Tool,
] as const satisfies readonly ModelRoutingRole[]

export const modelRoutingRoleMeta = {
  [ModelRoutingRole.Chat]: {
    title: 'Chat model',
    description: 'Used for low-compute chat and completion use cases.',
    modelHint: 'Configured in the provider connection settings.',
  },
  [ModelRoutingRole.Embedding]: {
    title: 'Embedding model',
    description:
      'Indexes Kubernetes and IaC state information for semantic search.',
    modelHint: 'Configured in the provider connection settings.',
  },
  [ModelRoutingRole.Tool]: {
    title: 'Tool model',
    description: 'Used for complex agentic inference.',
    modelHint: 'Configured in the provider connection settings.',
  },
} as const satisfies Record<
  ModelRoutingRole,
  {
    title: string
    description: string
    modelHint: string
  }
>

type ProviderConfigKey = (typeof providerSettingsKey)[AiProvider]
export type ModelDefaultsByProvider = Partial<Record<AiProvider, ModelDefault>>

type ProviderModelField = ModelDefaultField | 'modelId' | 'toolModelId'

function modelFieldKeyFor(
  provider: AiProvider,
  role: ModelRoutingRole
): ProviderModelField {
  if (provider === AiProvider.Bedrock) {
    switch (role) {
      case ModelRoutingRole.Chat:
        return 'modelId'
      case ModelRoutingRole.Tool:
        return 'toolModelId'
      default:
        return 'embeddingModel'
    }
  }

  return modelDefaultFieldByRole[role]
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

function selectedProviderForRole(
  role: ModelRoutingRole,
  routing: ModelRoutingState
): Nullable<AiProvider> {
  switch (role) {
    case ModelRoutingRole.Chat:
      return routing.provider
    case ModelRoutingRole.Tool:
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

  return (
    effectiveModelForRole(
      role,
      provider,
      ai,
      modelDefaultsByProvider
    )?.trim() || DEFAULT_MODEL_ROUTING_OPTION
  )
}

function effectiveModelForRole(
  role: ModelRoutingRole,
  provider: AiProvider,
  ai: Nullable<AiSettings>,
  modelDefaultsByProvider?: ModelDefaultsByProvider
): Nullable<string> {
  const key = providerSettingsKey[provider]
  const field = modelFieldKeyFor(provider, role)
  const serverConfig = ai?.[key as ProviderConfigKey]
  const value = serverConfig?.[field as keyof NonNullable<typeof serverConfig>]
  if (typeof value === 'string' && value.trim()) return value

  const defaults = defaultsForProvider(provider, modelDefaultsByProvider)
  return modelForRole(role, defaults)?.trim() || null
}

function defaultsForProvider(
  provider: AiProvider,
  modelDefaultsByProvider?: ModelDefaultsByProvider
): Nullable<ModelDefault> {
  if (provider === AiProvider.OpenaiCompatible) {
    return modelDefaultsByProvider?.[AiProvider.Openai] ?? null
  }

  return modelDefaultsByProvider?.[provider] ?? null
}

export function modelForRole(
  role: ModelRoutingRole,
  modelDefault: Nullable<ModelDefault>
): Nullable<string> {
  return modelDefault?.[modelDefaultFieldByRole[role]] ?? null
}

export function modelDefaultForProvider(
  provider: AiProvider,
  ai: Nullable<AiSettings>,
  modelDefaultsByProvider?: ModelDefaultsByProvider
): Nullable<ModelDefault> {
  const model = effectiveModelForRole(
    ModelRoutingRole.Chat,
    provider,
    ai,
    modelDefaultsByProvider
  )

  if (!model) return null

  return {
    provider,
    model,
    toolModel:
      effectiveModelForRole(
        ModelRoutingRole.Tool,
        provider,
        ai,
        modelDefaultsByProvider
      ) ?? '',
    embeddingModel: effectiveModelForRole(
      ModelRoutingRole.Embedding,
      provider,
      ai,
      modelDefaultsByProvider
    ),
  }
}

export function setRoutingProvider(
  role: ModelRoutingRole,
  provider: Nullable<AiProvider>,
  routing: ModelRoutingState
): ModelRoutingState {
  switch (role) {
    case ModelRoutingRole.Chat:
      return provider ? { ...routing, provider } : routing
    case ModelRoutingRole.Tool:
      return { ...routing, toolProvider: provider }
    default:
      return { ...routing, embeddingProvider: provider }
  }
}

import {
  AwsLogoIcon,
  AzureLogoIcon,
  ClaudeLogoIcon,
  Flex,
  IconFrame,
  IconProps,
  OpenAILogoIcon,
  OllamaLogoIcon,
  OpenCodeLogoIcon,
  PencilIcon,
  Table,
  VertexLogoIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { DeleteIconButton } from 'components/utils/IconButtons'
import { AiProvider, AiSettings } from 'generated/graphql'
import { ComponentType, useMemo } from 'react'
import { useTheme } from 'styled-components'
import { aiProviderToLabel } from './AISettingsProviders.tsx'

type ConfiguredAiProvider = {
  provider: AiProvider
  name: string
}

type AISettingsProvidersTableMeta = {
  onEdit: (provider: AiProvider) => void
}

export const aiProviderToIcon = {
  [AiProvider.Openai]: OpenAILogoIcon,
  [AiProvider.OpenaiCompatible]: OpenCodeLogoIcon,
  [AiProvider.Anthropic]: ClaudeLogoIcon,
  [AiProvider.Azure]: AzureLogoIcon,
  [AiProvider.Bedrock]: AwsLogoIcon,
  [AiProvider.Ollama]: OllamaLogoIcon,
  [AiProvider.Vertex]: VertexLogoIcon,
} as const satisfies Record<AiProvider, ComponentType<IconProps>>

export function getConfiguredProviders(ai: Nullable<AiSettings>): AiProvider[] {
  if (!ai) return []

  return configuredProviderSources.flatMap(([provider, key]) =>
    ai[key] ? [provider] : []
  )
}

export function getUnconfiguredProviders(
  ai: Nullable<AiSettings>
): AiProvider[] {
  const configured = new Set(
    ai
      ? configuredProviderSources.flatMap(([provider, key]) =>
          ai[key] ? [provider] : []
        )
      : []
  )

  return Object.values(AiProvider).filter(
    (provider) => !configured.has(provider)
  )
}

const configuredProviderSources = [
  [AiProvider.Openai, 'openai', 'model'],
  [AiProvider.OpenaiCompatible, 'openaiCompatible', 'model'],
  [AiProvider.Anthropic, 'anthropic', 'model'],
  [AiProvider.Azure, 'azure', 'model'],
  [AiProvider.Bedrock, 'bedrock', 'modelId'],
  [AiProvider.Ollama, 'ollama', 'model'],
  [AiProvider.Vertex, 'vertex', 'model'],
] as const satisfies readonly [
  AiProvider,
  keyof Pick<
    AiSettings,
    | 'openai'
    | 'openaiCompatible'
    | 'anthropic'
    | 'azure'
    | 'bedrock'
    | 'ollama'
    | 'vertex'
  >,
  'model' | 'modelId',
][]

const columnHelper = createColumnHelper<ConfiguredAiProvider>()

const columns = [
  columnHelper.accessor((row) => row, {
    id: 'Provider',
    meta: { gridTemplate: '1fr' },
    cell: function Cell({ getValue }) {
      const { colors } = useTheme()
      const { provider, name } = getValue()
      const Icon = aiProviderToIcon[provider]

      return (
        <Flex
          align="center"
          gap="small"
        >
          <IconFrame
            size="medium"
            type="secondary"
            tooltip={aiProviderToLabel[provider]}
            icon={<Icon fullColor />}
            css={{ backgroundColor: colors['fill-one'] }}
          />
          <span>{name}</span>
        </Flex>
      )
    },
  }),
  columnHelper.display({
    id: 'actions',
    meta: { gridTemplate: 'fit-content(100px)' },
    cell: function Cell({ row, table }) {
      const { onEdit } = table.options.meta as AISettingsProvidersTableMeta

      return (
        <Flex
          gap="xsmall"
          justify="flex-end"
        >
          <IconFrame
            clickable
            tooltip="Edit provider"
            icon={<PencilIcon />}
            onClick={() => onEdit(row.original.provider)}
          />
          <DeleteIconButton
            clickable={false}
            tooltip="Delete provider"
          />
        </Flex>
      )
    },
  }),
]

export function AISettingsConfiguredProviders({
  ai,
  onEdit,
  enabled = true,
}: {
  ai: Nullable<AiSettings>
  onEdit: (provider: AiProvider) => void
  enabled?: boolean
}) {
  const configuredProviders = useMemo(
    () =>
      ai
        ? configuredProviderSources.flatMap(([provider, key]) => {
            const config = ai[key]
            if (!config) return []

            return [{ provider, name: aiProviderToLabel[provider] }]
          })
        : [],
    [ai]
  )

  return (
    <div style={{ position: 'relative' }}>
      <Table
        fillLevel={1}
        data={configuredProviders}
        columns={columns}
        reactTableOptions={{ meta: { onEdit } }}
        emptyStateProps={{ message: 'No providers configured.' }}
      />
      {!enabled && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            backgroundColor: 'rgba(33, 36, 44, 0.7)',
            cursor: 'not-allowed',
          }}
        />
      )}
    </div>
  )
}

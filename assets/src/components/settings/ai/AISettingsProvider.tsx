import {
  Button,
  Card,
  Flex,
  FormField,
  ListBoxItem,
  Select,
  SelectPropsSingle,
  Switch,
  Toast,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert.tsx'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Body2P } from 'components/utils/typography/Text'
import {
  AiProvider,
  AiSettingsAttributes,
  useDeploymentSettingsSuspenseQuery,
  useUpdateDeploymentSettingsMutation,
} from 'generated/graphql'
import { produce } from 'immer'
import merge from 'lodash/merge'
import pick from 'lodash/pick'
import { FormEvent, ReactNode, useMemo, useReducer, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { PartialDeep } from 'type-fest'
import { AISettingsConfiguredProviders } from './AISettingsConfiguredProviders.tsx'
import {
  AnthropicSettings,
  AzureSettings,
  BedrockSettings,
  initialSettingsAttributes,
  OllamaSettings,
  OpenAISettings,
  validateAttributes,
  VertexSettings,
} from './AISettingsProviders.tsx'

const updateSettings = produce(
  (
    original: Omit<AiSettingsAttributes, 'enabled' | 'provider'>,
    update: PartialDeep<Omit<AiSettingsAttributes, 'enabled' | 'provider'>>
  ) => {
    merge(original, update)

    return original
  }
)

const providerSettingsKey: Record<
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

export function AISettingsProvider() {
  const theme = useTheme()
  const { data: deploymentSettings, error: deploymentSettingsError } =
    useDeploymentSettingsSuspenseQuery()
  const ai = deploymentSettings.deploymentSettings?.ai

  const [enabled, setEnabled] = useState<boolean>(ai?.enabled ?? false)
  const [provider, setProvider] = useState<AiProvider>(
    ai?.provider ?? AiProvider.Openai
  )
  const [providerSettings, updateProviderSettings] = useReducer(
    updateSettings,
    initialSettingsAttributes(ai)
  )
  const [showToast, setShowToast] = useState(false)

  let settings: ReactNode
  switch (provider) {
    case AiProvider.Openai:
      settings = (
        <OpenAISettings
          enabled={enabled}
          settings={providerSettings.openai}
          updateSettings={(settings) =>
            updateProviderSettings({ openai: settings })
          }
        />
      )
      break
    case AiProvider.OpenaiCompatible:
      settings = (
        <OpenAISettings
          enabled={enabled}
          settings={providerSettings.openaiCompatible}
          updateSettings={(settings) =>
            updateProviderSettings({ openaiCompatible: settings })
          }
        />
      )
      break
    case AiProvider.Anthropic:
      settings = (
        <AnthropicSettings
          enabled={enabled}
          settings={providerSettings.anthropic}
          updateSettings={(settings) =>
            updateProviderSettings({ anthropic: settings })
          }
        />
      )
      break
    case AiProvider.Bedrock:
      settings = (
        <BedrockSettings
          enabled={enabled}
          settings={providerSettings.bedrock}
          updateSettings={(settings) =>
            updateProviderSettings({ bedrock: settings })
          }
        />
      )
      break
    case AiProvider.Ollama:
      settings = (
        <OllamaSettings
          enabled={enabled}
          settings={providerSettings.ollama}
          updateSettings={(settings) =>
            updateProviderSettings({ ollama: settings })
          }
        />
      )
      break
    case AiProvider.Azure:
      settings = (
        <AzureSettings
          enabled={enabled}
          settings={providerSettings.azure}
          updateSettings={(settings) =>
            updateProviderSettings({ azure: settings })
          }
        />
      )
      break
    case AiProvider.Vertex:
      settings = (
        <VertexSettings
          enabled={enabled}
          settings={providerSettings.vertex}
          updateSettings={(settings) =>
            updateProviderSettings({ vertex: settings })
          }
        />
      )
      break
  }

  const valid = useMemo(
    () => validateAttributes(enabled, provider, providerSettings),
    [enabled, provider, providerSettings]
  )

  const [mutation, { loading, error }] = useUpdateDeploymentSettingsMutation({
    variables: {
      attributes: {
        ai: {
          enabled,
          ...(enabled
            ? {
                provider,
                ...pick(providerSettings, providerSettingsKey[provider]),
              }
            : {}),
        } satisfies AiSettingsAttributes,
      },
    },
    onCompleted: (data) => {
      setShowToast(true)
      updateProviderSettings(
        initialSettingsAttributes(data?.updateDeploymentSettings?.ai)
      )
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation()
  }

  return (
    <ScrollablePage>
      <Flex
        direction="column"
        gap="medium"
      >
        <AISettingsConfiguredProviders
          ai={ai}
          onEdit={setProvider}
        />
        <Switch
          checked={enabled}
          onChange={(checked) => setEnabled(checked)}
        >
          Enable AI insights
        </Switch>
        <WrapperCardSC
          forwardedAs="form"
          onSubmit={handleSubmit}
        >
          {(error || deploymentSettingsError) && (
            <GqlError error={error || deploymentSettingsError} />
          )}
          <FormField label="AI provider">
            <SelectWithDisable
              disabled={!enabled}
              selectedKey={provider}
              onSelectionChange={(v) => {
                setProvider(v as AiProvider)
              }}
            >
              <ListBoxItem
                key={AiProvider.Openai}
                label="OpenAI"
              />
              <ListBoxItem
                key={AiProvider.OpenaiCompatible}
                label="OpenAI-compatible"
              />
              <ListBoxItem
                key={AiProvider.Anthropic}
                label="Anthropic"
              />
              <ListBoxItem
                key={AiProvider.Azure}
                label="Azure AI"
              />
              <ListBoxItem
                key={AiProvider.Bedrock}
                label="AWS Bedrock"
              />
              <ListBoxItem
                key={AiProvider.Ollama}
                label="Ollama"
              />
              <ListBoxItem
                key={AiProvider.Vertex}
                label="Vertex AI"
              />
            </SelectWithDisable>
          </FormField>
          <Body2P $color="text-xlight">
            Note: model fields can be left blank to use Plural defaults unless
            otherwise specified.
          </Body2P>
          {settings}
          <Button
            alignSelf="flex-end"
            type="submit"
            disabled={!valid || (!ai?.enabled && !enabled)}
            loading={loading}
          >
            Save changes
          </Button>
        </WrapperCardSC>
      </Flex>
      <Toast
        severity="success"
        css={{ margin: theme.spacing.large }}
        position="bottom"
        show={showToast}
        onClose={() => setShowToast(false)}
      >
        Changes saved
      </Toast>
    </ScrollablePage>
  )
}

const WrapperCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: theme.spacing.xlarge,
}))

function SelectWithDisable({
  disabled,
  ...props
}: { disabled: boolean } & SelectPropsSingle) {
  const theme = useTheme()
  return (
    <div
      css={
        disabled
          ? {
              '& div:last-child': {
                color: theme.colors['text-input-disabled'],
                cursor: 'unset',
              },
            }
          : undefined
      }
    >
      <Select
        {...props}
        isDisabled={disabled}
      />
    </div>
  )
}

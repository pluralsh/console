import {
  AiSparkleFilledIcon,
  Button,
  Card,
  Flex,
  FormField,
  ListBoxItem,
  Radio,
  RadioGroup,
  Select,
  Switch,
  Toast,
  SelectPropsSingle,
} from '@pluralsh/design-system'
import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import {
  Body1BoldP,
  Body2BoldP,
  Body2P,
} from 'components/utils/typography/Text'
import {
  AiProvider,
  AiSettingsAttributes,
  useClearChatHistoryMutation,
  useUpdateDeploymentSettingsMutation,
} from 'generated/graphql'
import { FormEvent, ReactNode, useMemo, useReducer, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { produce } from 'immer'
import { PartialDeep } from 'type-fest'
import merge from 'lodash/merge'
import {
  AnthropicSettings,
  AzureSettings,
  BedrockSettings,
  initialSettingsAttributes,
  OllamaSettings,
  OpenAISettings,
  validateAttributes,
  VertexSettings,
} from './GlobalSettingsAIProviders.tsx'
import { GqlError } from '../../utils/Alert.tsx'
import pick from 'lodash/pick'
import {
  AIVerbosityLevel,
  useExplainWithAIContext,
} from '../../ai/AIContext.tsx'

const updateSettings = produce(
  (
    original: Omit<AiSettingsAttributes, 'enabled' | 'provider'>,
    update: PartialDeep<Omit<AiSettingsAttributes, 'enabled' | 'provider'>>
  ) => {
    merge(original, update)

    return original
  }
)

export function GlobalSettingsAiProvider() {
  const theme = useTheme()
  const { ai } = useDeploymentSettings()
  const [enabled, setEnabled] = useState<boolean>(ai?.enabled ?? false)
  const [provider, setProvider] = useState<AiProvider>(
    ai?.provider ?? AiProvider.Openai
  )
  const [providerSettings, updateProviderSettings] = useReducer(
    updateSettings,
    initialSettingsAttributes(ai)
  )
  const { verbosityLevel, setVerbosityLevel } = useExplainWithAIContext()
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
            ? { provider, ...pick(providerSettings, provider.toLowerCase()) }
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

  const [
    clearChatHistory,
    { loading: clearingChatHistory, error: errorClearingChatHistory },
  ] = useClearChatHistoryMutation()

  return (
    <ScrollablePage>
      <Flex
        direction={'column'}
        gap={'medium'}
      >
        <WrapperCardSC
          forwardedAs="form"
          onSubmit={handleSubmit}
        >
          {error && <GqlError error={error} />}
          {errorClearingChatHistory && (
            <GqlError error={errorClearingChatHistory} />
          )}
          <Flex justifyContent={'space-between'}>
            <Switch
              checked={enabled}
              onChange={(checked) => setEnabled(checked)}
            >
              Enable AI insights
            </Switch>
            <Button
              secondary
              loading={clearingChatHistory}
              onClick={() => clearChatHistory()}
            >
              Clear chat history
            </Button>
          </Flex>
          <FormField label="AI provider">
            <SelectWithDisable
              disabled={!enabled}
              selectedKey={provider}
              onSelectionChange={(v) => {
                setProvider(v as AiProvider)
              }}
            >
              <ListBoxItem
                key={AiProvider.Bedrock}
                label={'Amazon Bedrock'}
              />
              <ListBoxItem
                key={AiProvider.Anthropic}
                label={'Anthropic'}
              />
              <ListBoxItem
                key={AiProvider.Azure}
                label={'Azure AI'}
              />
              <ListBoxItem
                key={AiProvider.Ollama}
                label={'Ollama'}
              />
              <ListBoxItem
                key={AiProvider.Openai}
                label={'OpenAI'}
              />
              <ListBoxItem
                key={AiProvider.Vertex}
                label={'Vertex AI'}
              />
            </SelectWithDisable>
          </FormField>
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
        {enabled && (
          <>
            <Card
              css={{
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing.small,
                padding: theme.spacing.xlarge,
              }}
            >
              <Body2BoldP>AI explain length</Body2BoldP>
              <Body2P>
                Control the level of depth for the “Explain with AI” feature on
                some pages. Please note that this is local setting that impacts
                only your current browser.
              </Body2P>
              <RadioGroup
                value={verbosityLevel}
                onChange={(v) => setVerbosityLevel(v as AIVerbosityLevel)}
                css={{
                  backgroundColor: theme.colors['fill-two'],
                  borderRadius: theme.borderRadiuses.large,
                  display: 'flex',
                  gap: theme.spacing.xxxxxlarge,
                  padding: theme.spacing.medium,
                }}
              >
                {Object.values(AIVerbosityLevel).map((value) => (
                  <Radio
                    value={value}
                    key={value}
                  >
                    {value}
                  </Radio>
                ))}
              </RadioGroup>
            </Card>
            <InsightsCallout />
          </>
        )}
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
  gap: theme.spacing.large,
  padding: theme.spacing.xlarge,
}))

const InsightsCalloutSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.small,
  alignItems: 'flex-start',
  background: theme.colors['fill-two'],
  borderRadius: theme.borderRadiuses.medium,
  padding: theme.spacing.medium,
  borderLeft: `3px solid ${theme.colors['border-info']}`,
}))

function InsightsCallout() {
  return (
    <InsightsCalloutSC>
      <AiSparkleFilledIcon
        marginTop="xxsmall"
        color="icon-info"
      />
      <Flex
        direction="column"
        gap="xxsmall"
      >
        <Body1BoldP>
          Look out for the Insights icon, shown to the left
        </Body1BoldP>
        <Body2P $color="text-light">
          Wherever you see this icon there will be AI-generated insights.
        </Body2P>
      </Flex>
    </InsightsCalloutSC>
  )
}

function SelectWithDisable({
  disabled,
  ...props
}: { disabled: boolean } & SelectPropsSingle) {
  const theme = useTheme()
  return (
    <div
      css={
        disabled && {
          '& div:last-child': {
            color: theme.colors['text-input-disabled'],
            cursor: 'unset',
          },
        }
      }
    >
      <Select
        {...props}
        isDisabled={disabled}
      />
    </div>
  )
}

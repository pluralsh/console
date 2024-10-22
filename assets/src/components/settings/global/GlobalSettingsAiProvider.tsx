import {
  AiSparkleFilledIcon,
  Button,
  Card,
  Flex,
  FormField,
  Input,
  ListBoxItem,
  Select,
  Switch,
  Toast,
} from '@pluralsh/design-system'
import { SelectPropsSingle } from '@pluralsh/design-system/dist/components/Select'
import { InputRevealer } from 'components/cd/providers/InputRevealer'
import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext'
import { GqlError } from 'components/utils/Alert'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Body1BoldP, Body2P } from 'components/utils/typography/Text'
import {
  AiProvider,
  AiSettingsFragment,
  useUpdateDeploymentSettingsMutation,
} from 'generated/graphql'
import { FormEvent, useState } from 'react'
import styled, { useTheme } from 'styled-components'

type AiForm = {
  provider: AiProvider
  model: string | null
  accessToken: string
  enabled: boolean
}

export function GlobalSettingsAiProvider() {
  const theme = useTheme()
  const { ai } = useDeploymentSettings()
  const [form, setForm] = useState<AiForm>(getInitialAiForm(ai))
  const [showToast, setShowToast] = useState(false)

  const [mutation, { loading, error }] = useUpdateDeploymentSettingsMutation({
    variables: {
      attributes: {
        ai: !form.enabled
          ? { enabled: false }
          : {
              enabled: true,
              provider: form.provider,
              ...(form.provider === AiProvider.Openai && {
                openai: {
                  model: form.model === '' ? null : form.model,
                  accessToken: form.accessToken,
                },
              }),
              ...(form.provider === AiProvider.Anthropic && {
                anthropic: {
                  model: form.model === '' ? null : form.model,
                  accessToken: form.accessToken,
                },
              }),
            },
      },
    },
    onCompleted: () => {
      setShowToast(true)
      setForm({
        ...form,
        accessToken: '',
      })
    },
  })

  const allowSubmit = !!form.accessToken || form.enabled !== ai?.enabled

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation()
  }

  return (
    <ScrollablePage>
      <WrapperCardSC
        forwardedAs="form"
        onSubmit={handleSubmit}
      >
        {error && <GqlError error={error} />}
        <Switch
          checked={form.enabled}
          onChange={(checked) =>
            setForm({
              ...form,
              enabled: checked,
            })
          }
        >
          Enable AI insights
        </Switch>
        <FormField label="AI provider">
          <SelectWithDisable
            disabled={!form.enabled}
            selectedKey={form.provider}
            onSelectionChange={(val) => {
              setForm({
                ...form,
                provider: val as AiProvider,
              })
            }}
          >
            <ListBoxItem
              key={AiProvider.Openai}
              label={'OpenAI'}
            />
            <ListBoxItem
              key={AiProvider.Anthropic}
              label={'Anthropic'}
            />
          </SelectWithDisable>
        </FormField>
        <Flex gap="large">
          <FormField
            label="Model"
            flex={1}
          >
            <Input
              disabled={!form.enabled}
              placeholder="Leave blank for Plural default"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
          </FormField>
          <FormField
            label="Access token"
            flex={1}
          >
            <InputRevealer
              css={{ background: theme.colors['fill-two'] }}
              disabled={!form.enabled}
              placeholder="Enter access token"
              value={form.accessToken}
              onChange={(e) =>
                setForm({ ...form, accessToken: e.target.value })
              }
            />
          </FormField>
        </Flex>
        <Button
          alignSelf="flex-end"
          type="submit"
          disabled={!allowSubmit}
          loading={loading}
        >
          Save changes
        </Button>
      </WrapperCardSC>
      {form.enabled && <InsightsCallout />}
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

function getInitialAiForm(ai: Nullable<AiSettingsFragment>): AiForm {
  const initialForm = { ...defaultForm }
  initialForm.enabled = ai?.enabled ?? false
  initialForm.provider = ai?.provider ?? AiProvider.Openai

  if (ai?.provider === AiProvider.Openai) {
    initialForm.model = ai?.openai?.model ?? ''
  } else if (ai?.provider === AiProvider.Anthropic) {
    initialForm.model = ai?.anthropic?.model ?? ''
  }

  return initialForm
}

const defaultForm: AiForm = {
  provider: AiProvider.Openai,
  model: null,
  accessToken: '',
  enabled: false,
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
  marginTop: theme.spacing.medium,
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

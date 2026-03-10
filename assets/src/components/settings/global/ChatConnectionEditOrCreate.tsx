import {
  Button,
  Code,
  Flex,
  FormField,
  ListBoxItem,
  ReturnIcon,
  Select,
  SemanticColorKey,
  ValidatedInput,
} from '@pluralsh/design-system'
import { useState } from 'react'
import { useTheme } from 'styled-components'

import { GqlError } from 'components/utils/Alert'
import {
  ActionToastInfo,
  SimpleToastChip,
} from 'components/utils/SimpleToastChip'
import { Body2BoldP, Body2P } from 'components/utils/typography/Text'
import { InlineLink } from 'components/utils/typography/InlineLink'

import {
  ChatProviderConnection,
  ChatProviderConnectionType,
  useUpsertChatProviderConnectionMutation,
} from 'generated/graphql'

import {
  CHAT_CONNECTION_CREATE_ID_KEY,
  ChatConnectionEditT,
} from './GlobalSettingsChatConnections'

export function ChatConnectionEditOrCreate({
  connection,
  setConnectionEdit,
}: {
  connection: ChatConnectionEditT
  setConnectionEdit: (connection: ChatConnectionEditT | null) => void
}) {
  const theme = useTheme()
  const isCreating = connection === CHAT_CONNECTION_CREATE_ID_KEY
  const existingConnection = !isCreating
    ? (connection as ChatProviderConnection)
    : undefined

  const [name, setName] = useState(existingConnection?.name ?? '')
  const [selectedType, setSelectedType] = useState<
    ChatProviderConnectionType | undefined
  >(existingConnection?.type)

  const [botId, setBotId] = useState(
    existingConnection?.configuration.slack?.botId ?? ''
  )
  const [botToken, setBotToken] = useState('')
  const [appToken, setAppToken] = useState('')

  const [toast, setToast] = useState<ActionToastInfo | null>(null)

  const allowSubmit =
    !!name &&
    !!selectedType &&
    (selectedType === ChatProviderConnectionType.Slack
      ? !!appToken && !!botToken
      : true)

  const popToast = (
    name: Nullable<string>,
    action: string,
    color: SemanticColorKey
  ) => setToast({ name, action, color })

  const [upsert, { loading, error }] = useUpsertChatProviderConnectionMutation({
    onCompleted: ({ upsertChatProviderConnection }) => {
      if (!upsertChatProviderConnection) return

      setConnectionEdit(upsertChatProviderConnection)
      popToast(
        upsertChatProviderConnection.name,
        isCreating ? 'created' : 'updated',
        'icon-info'
      )
      setBotToken('')
      setAppToken('')
    },
    refetchQueries: ['ChatProviderConnections'],
  })

  const handleSubmit = () => {
    if (!selectedType || !allowSubmit) return

    const configuration =
      selectedType === ChatProviderConnectionType.Slack
        ? {
            slack: {
              appToken,
              botToken,
              botId: botId || undefined,
            },
          }
        : {}

    upsert({
      variables: {
        attributes: {
          name,
          type: selectedType,
          configuration,
        },
      },
    })
  }

  return (
    <Flex
      direction="column"
      gap="medium"
      minHeight={0}
    >
      {error && <GqlError error={error} />}
      <ValidatedInput
        label="Connection name"
        value={name}
        onChange={({ target: { value } }) => setName(value)}
        placeholder="Enter chat connection name"
      />
      <FormField
        label="Chat provider"
        required
      >
        <Select
          selectedKey={selectedType}
          label="Select chat provider"
          onSelectionChange={(key) =>
            setSelectedType(key as ChatProviderConnectionType)
          }
        >
          <ListBoxItem
            key={ChatProviderConnectionType.Slack}
            label="Slack"
          />
          <ListBoxItem
            key={ChatProviderConnectionType.Teams}
            label="Microsoft Teams"
          />
        </Select>
      </FormField>

      {selectedType === ChatProviderConnectionType.Slack && (
        <>
          <ValidatedInput
            label="Slack bot ID (optional)"
            value={botId}
            onChange={({ target: { value } }) => setBotId(value)}
            placeholder="B0123456789"
          />
          <ValidatedInput
            label="Slack bot token"
            type="password"
            value={botToken}
            onChange={({ target: { value } }) => setBotToken(value)}
            placeholder="xoxb-..."
          />
          <ValidatedInput
            label="Slack app token"
            type="password"
            value={appToken}
            onChange={({ target: { value } }) => setAppToken(value)}
            placeholder="xapp-..."
          />
          <Body2P $color="text-light">
            Create a Slack app in your workspace using a manifest like the one
            below, then install it and copy the generated{' '}
            <InlineLink
              href="https://api.slack.com/authentication/token-types#granular_bot"
              target="_blank"
              rel="noreferrer"
            >
              bot
            </InlineLink>{' '}
            and{' '}
            <InlineLink
              href="https://api.slack.com/apis/connections/socket-implement"
              target="_blank"
              rel="noreferrer"
            >
              app
            </InlineLink>{' '}
            tokens into the fields above.
          </Body2P>
          <Code language="yaml">
            {`display_information:
  name: Plural Console
features:
  bot_user:
    display_name: Plural Console Bot
oauth_config:
  scopes:
    bot:
      - chat:write
      - chat:write.public
      - channels:read
      - groups:read
      - im:read
      - mpim:read
settings:
  interactivity:
    is_enabled: true
  org_deploy_enabled: false
  socket_mode_enabled: true
  token_rotation_enabled: false`}
          </Code>
        </>
      )}

      {selectedType === ChatProviderConnectionType.Teams && (
        <>
          <Body2P $color="text-light">
            To connect Microsoft Teams, create an incoming webhook using the
            Teams{' '}
            <InlineLink
              href="https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook"
              target="_blank"
              rel="noreferrer"
            >
              Workflows / incoming webhook
            </InlineLink>{' '}
            experience, then configure it to post messages into the channel you
            want Console notifications to appear in.
          </Body2P>
          <Body2P $color="text-light">
            When the workflow is created, copy the generated webhook URL and
            store it securely according to your organization&apos;s policies.
            Console will use that URL to send messages for this connection.
          </Body2P>
        </>
      )}

      <Flex
        gap="medium"
        alignSelf="flex-end"
        marginTop={theme.spacing.large}
      >
        <Button
          secondary
          startIcon={<ReturnIcon />}
          onClick={() => setConnectionEdit(null)}
        >
          Back to all chat connections
        </Button>
        <Button
          disabled={!allowSubmit}
          loading={loading}
          onClick={handleSubmit}
        >
          {isCreating ? 'Create connection' : 'Save'}
        </Button>
      </Flex>
      <SimpleToastChip
        key={JSON.stringify(toast)}
        show={!!toast}
        delayTimeout={2500}
        onClose={() => setToast(null)}
      >
        {toast?.name}{' '}
        <Body2BoldP $color={toast?.color}>{toast?.action}</Body2BoldP>
      </SimpleToastChip>
    </Flex>
  )
}

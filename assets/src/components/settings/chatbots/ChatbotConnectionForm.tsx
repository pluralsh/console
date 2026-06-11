import {
  Button,
  Card,
  Flex,
  FormField,
  Input2,
  ListBoxItem,
  ReturnIcon,
  Select,
} from '@pluralsh/design-system'
import { bindingToBindingAttributes } from 'components/utils/bindings'
import { GqlError } from 'components/utils/Alert'
import { PolicyBindingsCardForm } from 'components/utils/PolicyBindingsCardForm'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import {
  ChatProviderConnectionFragment,
  ChatProviderConnectionType,
  PolicyBindingFragment,
  useUpsertChatProviderConnectionMutation,
} from 'generated/graphql'
import { isEqual } from 'lodash'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CHATBOTS_SETTINGS_ABS_PATH } from 'routes/settingsRoutesConst'
import { WORKBENCHES_CHATBOT_SELECTED_QUERY_PARAM } from 'routes/workbenchesRoutesConsts'
import { isNonNullable } from 'utils/isNonNullable'
import {
  chatProviderConnectionIcon,
  chatProviderConnectionLabel,
} from 'components/workbenches/workbench/chatbots/utils'
import { Overline } from 'components/cd/utils/PermissionsModal'
import { StickyActionsFooterSC } from 'components/workbenches/workbench/create-edit/WorkbenchCreateOrEdit'
import styled, { useTheme } from 'styled-components'

type RouteState = {
  returnPath?: string
  draftState?: unknown
}

type ChatbotConnectionFormState = {
  name: string
  appToken: string
  botToken: string
  readBindings: PolicyBindingFragment[]
  writeBindings: PolicyBindingFragment[]
}

export function ChatbotConnectionForm({
  existingConnection,
}: {
  existingConnection?: Nullable<ChatProviderConnectionFragment>
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = location.state as Nullable<RouteState>
  const { popToast } = useSimpleToast()
  const mode = existingConnection ? 'edit' : 'create'
  const initialFormState = useMemo(
    () => getInitialFormState(existingConnection),
    [existingConnection]
  )
  const [formState, setFormState] =
    useState<ChatbotConnectionFormState>(initialFormState)

  const name = formState.name.trim()
  const appToken = formState.appToken.trim()
  const botToken = formState.botToken.trim()
  const canSave =
    !!name &&
    !!appToken &&
    !!botToken &&
    (mode === 'create' || !isEqual(formState, initialFormState))

  const attributes = {
    name,
    type: ChatProviderConnectionType.Slack,
    configuration: {
      slack: {
        appToken,
        botToken,
      },
    },
    readBindings: formState.readBindings.map(bindingToBindingAttributes),
    writeBindings: formState.writeBindings.map(bindingToBindingAttributes),
  }

  const [upsertChatProviderConnection, { loading, error }] =
    useUpsertChatProviderConnectionMutation({
      variables: { attributes },
      onCompleted: ({ upsertChatProviderConnection }) => {
        const label = upsertChatProviderConnection?.name ?? 'chatbot'

        popToast({
          content: `${label} ${mode === 'create' ? 'created' : 'updated'}`,
          severity: 'success',
        })

        const returnPath = routeState?.returnPath
        const createdId = upsertChatProviderConnection?.id

        if (returnPath && createdId) {
          navigate(
            `${returnPath}${returnPath.includes('?') ? '&' : '?'}${WORKBENCHES_CHATBOT_SELECTED_QUERY_PARAM}=${createdId}`,
            { state: { draftState: routeState?.draftState } }
          )
        } else navigate(CHATBOTS_SETTINGS_ABS_PATH)
      },
      refetchQueries: ['ChatProviderConnections'],
      awaitRefetchQueries: true,
    })

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
      width="100%"
      overflow="hidden"
    >
      {error && <GqlError error={error} />}
      <Flex
        direction="column"
        paddingRight={theme.spacing.xsmall}
        gap="large"
        overflow="auto"
      >
        <CardSC>
          <Overline>Integration configuration</Overline>
          <FormField
            required
            layout="horizontal"
            label="Chat platform"
            hint="Only Slack is supported for Workbench chatbots currently."
          >
            <Select
              selectedKey="slack"
              isDisabled={true}
              leftContent={chatProviderConnectionIcon(
                ChatProviderConnectionType.Slack,
                false
              )}
            >
              <ListBoxItem
                key="slack"
                label={chatProviderConnectionLabel(
                  ChatProviderConnectionType.Slack
                )}
                leftContent={chatProviderConnectionIcon(
                  ChatProviderConnectionType.Slack,
                  false
                )}
              />
            </Select>
          </FormField>
          <FormField
            required
            layout="horizontal"
            label="Name"
            hint={
              mode === 'edit'
                ? 'Connection names cannot be changed from this screen.'
                : 'Display name shown when selecting this chatbot connection.'
            }
          >
            <Input2
              value={formState.name}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              disabled={loading || mode === 'edit'}
            />
          </FormField>
          <FormField
            required
            layout="horizontal"
            label="App-level token"
            hint="Starts with xapp-. Used for apps.connections.open (Socket Mode). Generate under Basic Information > App-Level Tokens with connections:write. Do not paste the xoxb- bot token here."
          >
            <Input2
              value={formState.appToken}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  appToken: e.target.value,
                }))
              }
              inputProps={{ type: 'password' }}
              disabled={loading}
            />
          </FormField>
          <FormField
            required
            layout="horizontal"
            label="Bot user OAuth token"
            hint="Starts with xoxb-. Bot User OAuth Token from OAuth & Permissions after install. Used for Slack Web API calls, not Socket Mode."
          >
            <Input2
              value={formState.botToken}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  botToken: e.target.value,
                }))
              }
              inputProps={{ type: 'password' }}
              disabled={loading}
            />
          </FormField>
        </CardSC>
        <PolicyBindingsCardForm
          layout="horizontal"
          readTitle="Read permissions"
          writeTitle="Write permissions"
          readBindings={formState.readBindings}
          writeBindings={formState.writeBindings}
          onReadBindingsChange={(readBindings) =>
            setFormState((prev) => ({ ...prev, readBindings }))
          }
          onWriteBindingsChange={(writeBindings) =>
            setFormState((prev) => ({ ...prev, writeBindings }))
          }
          readHints={{
            user: 'Users with read permissions for this chatbot connection',
            group: 'Groups with read permissions for this chatbot connection',
          }}
          writeHints={{
            user: 'Users with write permissions for this chatbot connection',
            group: 'Groups with write permissions for this chatbot connection',
          }}
        />
      </Flex>
      <StickyActionsFooterSC
        css={{
          justifyContent: 'flex-end',
          background: 'inherit',
          border: 'none',
          paddingTop: 0,
          marginTop: 0,
        }}
      >
        <Button
          secondary
          startIcon={<ReturnIcon />}
          onClick={() =>
            navigate(routeState?.returnPath ?? CHATBOTS_SETTINGS_ABS_PATH, {
              state: { draftState: routeState?.draftState },
            })
          }
          disabled={loading}
        >
          Back to all chatbots
        </Button>
        <Button
          onClick={() => upsertChatProviderConnection()}
          loading={loading}
          disabled={!canSave}
        >
          {mode === 'create' ? 'Create' : 'Update'}
        </Button>
      </StickyActionsFooterSC>
    </Flex>
  )
}

function getInitialFormState(
  existingConnection?: Nullable<ChatProviderConnectionFragment>
): ChatbotConnectionFormState {
  return {
    name: existingConnection?.name ?? '',
    appToken: '',
    botToken: '',
    readBindings: existingConnection?.readBindings?.filter(isNonNullable) ?? [],
    writeBindings:
      existingConnection?.writeBindings?.filter(isNonNullable) ?? [],
  }
}

const CardSC = styled(Card)(({ theme }) => ({
  padding: theme.spacing.large,
  minWidth: 150,
  maxWidth: '100%',
  gap: theme.spacing.large,
  display: 'flex',
  flexDirection: 'column',
}))

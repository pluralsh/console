import {
  Button,
  Flex,
  FormField,
  Input2,
  ListBoxItem,
  ReturnIcon,
  Select,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StackedText } from 'components/utils/table/StackedText'
import {
  ChatProviderConnectionType,
  useUpsertChatProviderConnectionMutation,
  useWorkbenchQuery,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  getWorkbenchChatbotsAbsPath,
  WORKBENCH_PARAM_ID,
  WORKBENCHES_CHATBOT_SELECTED_QUERY_PARAM,
} from 'routes/workbenchesRoutesConsts'
import { getWorkbenchBreadcrumbs } from '../Workbench'
import {
  FormCardSC,
  StickyActionsFooterSC,
} from '../create-edit/WorkbenchCreateOrEdit'
import {
  chatProviderConnectionIcon,
  chatProviderConnectionLabel,
} from './utils'

type RouteState = {
  returnPath?: string
  draftState?: unknown
}

type ChatbotConnectionFormState = {
  type: ChatProviderConnectionType
  name: string
  appToken: string
  botToken: string
  botId: string
  clientId: string
  clientSecret: string
  tenantId: string
}

const SUPPORTED_CHAT_PROVIDER_TYPES = [
  ChatProviderConnectionType.Slack,
  ChatProviderConnectionType.Teams,
] as const

export function ChatbotConnectionForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = location.state as Nullable<RouteState>
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const { popToast } = useSimpleToast()
  const [formState, setFormState] = useState<ChatbotConnectionFormState>({
    type: ChatProviderConnectionType.Slack,
    name: '',
    appToken: '',
    botToken: '',
    botId: '',
    clientId: '',
    clientSecret: '',
    tenantId: '',
  })

  const {
    data: workbenchData,
    loading: workbenchLoading,
    error: workbenchError,
  } = useWorkbenchQuery({
    variables: { id: workbenchId },
    fetchPolicy: 'cache-and-network',
    skip: !workbenchId,
  })
  const workbench = workbenchData?.workbench

  const name = formState.name.trim()
  const appToken = formState.appToken.trim()
  const botToken = formState.botToken.trim()
  const botId = formState.botId.trim()
  const clientId = formState.clientId.trim()
  const clientSecret = formState.clientSecret.trim()
  const tenantId = formState.tenantId.trim()
  const canSave =
    !!name &&
    (formState.type === ChatProviderConnectionType.Slack
      ? !!appToken && !!botToken
      : !!clientId && !!clientSecret && !!tenantId)

  const configuration =
    formState.type === ChatProviderConnectionType.Slack
      ? {
          slack: {
            appToken,
            botToken,
            botId: botId || null,
          },
        }
      : {
          teams: {
            clientId,
            clientSecret,
            tenantId,
          },
        }

  const [upsertChatProviderConnection, { loading, error }] =
    useUpsertChatProviderConnectionMutation({
      variables: {
        attributes: {
          name,
          type: formState.type,
          configuration,
        },
      },
      onCompleted: ({ upsertChatProviderConnection }) => {
        popToast({
          content: `${upsertChatProviderConnection?.name ?? 'chatbot'} created`,
          severity: 'success',
        })

        const returnPath = routeState?.returnPath
        const createdId = upsertChatProviderConnection?.id

        if (returnPath && createdId) {
          navigate(
            `${returnPath}${returnPath.includes('?') ? '&' : '?'}${WORKBENCHES_CHATBOT_SELECTED_QUERY_PARAM}=${createdId}`,
            { state: { draftState: routeState?.draftState } }
          )
        } else navigate(getWorkbenchChatbotsAbsPath(workbenchId))
      },
      refetchQueries: ['ChatProviderConnections'],
      awaitRefetchQueries: true,
    })

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getWorkbenchBreadcrumbs(workbench),
        { label: 'chatbots', url: getWorkbenchChatbotsAbsPath(workbenchId) },
        { label: 'add new chatbot' },
      ],
      [workbench, workbenchId]
    )
  )

  if (workbenchError) return <GqlError error={workbenchError} />

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
      width="100%"
      overflow="auto"
      padding="large"
    >
      <Flex
        direction="column"
        gap="large"
        width="100%"
        css={{ maxWidth: 750, marginInline: 'auto' }}
      >
        <StackedText
          loading={!workbenchData && workbenchLoading}
          first={workbench?.name}
          firstPartialType="subtitle2"
          firstColor="text"
          second={workbench?.description}
          secondPartialType="body2"
          secondColor="text-xlight"
          gap="xxsmall"
        />
        <FormCardSC>
          <Flex
            direction="column"
            gap="large"
            height="100%"
            width="100%"
          >
            {error && <GqlError error={error} />}
            <FormField
              required
              label="Chat platform"
            >
              <Select
                selectedKey={formState.type}
                label={chatProviderConnectionLabel(formState.type)}
                leftContent={chatProviderConnectionIcon(formState.type)}
                isDisabled={loading}
                onSelectionChange={(key) => {
                  if (!key) return

                  setFormState((prev) => ({
                    ...prev,
                    type: String(key) as ChatProviderConnectionType,
                  }))
                }}
              >
                {SUPPORTED_CHAT_PROVIDER_TYPES.map((type) => (
                  <ListBoxItem
                    key={type}
                    leftContent={chatProviderConnectionIcon(type)}
                    label={chatProviderConnectionLabel(type)}
                  />
                ))}
              </Select>
            </FormField>
            <FormField
              required
              label="Name"
            >
              <Input2
                value={formState.name}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Plural support bot"
                disabled={loading}
              />
            </FormField>
            {formState.type === ChatProviderConnectionType.Slack ? (
              <>
                <FormField
                  required
                  label="App token"
                >
                  <Input2
                    value={formState.appToken}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        appToken: e.target.value,
                      }))
                    }
                    disabled={loading}
                  />
                </FormField>
                <FormField
                  required
                  label="Bot token"
                >
                  <Input2
                    value={formState.botToken}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        botToken: e.target.value,
                      }))
                    }
                    disabled={loading}
                  />
                </FormField>
                <FormField label="Bot ID">
                  <Input2
                    value={formState.botId}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        botId: e.target.value,
                      }))
                    }
                    disabled={loading}
                  />
                </FormField>
              </>
            ) : (
              <>
                <FormField
                  required
                  label="Client ID"
                >
                  <Input2
                    value={formState.clientId}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        clientId: e.target.value,
                      }))
                    }
                    disabled={loading}
                  />
                </FormField>
                <FormField
                  required
                  label="Tenant ID"
                >
                  <Input2
                    value={formState.tenantId}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        tenantId: e.target.value,
                      }))
                    }
                    disabled={loading}
                  />
                </FormField>
                <FormField
                  required
                  label="Client secret"
                >
                  <Input2
                    value={formState.clientSecret}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        clientSecret: e.target.value,
                      }))
                    }
                    disabled={loading}
                  />
                </FormField>
              </>
            )}
            <StickyActionsFooterSC css={{ justifyContent: 'flex-end' }}>
              <Button
                secondary
                startIcon={<ReturnIcon />}
                onClick={() =>
                  navigate(
                    routeState?.returnPath ??
                      getWorkbenchChatbotsAbsPath(workbenchId),
                    { state: { draftState: routeState?.draftState } }
                  )
                }
                disabled={loading}
              >
                Back
              </Button>
              <Button
                onClick={() => upsertChatProviderConnection()}
                loading={loading}
                disabled={!canSave}
              >
                Save
              </Button>
            </StickyActionsFooterSC>
          </Flex>
        </FormCardSC>
      </Flex>
    </Flex>
  )
}

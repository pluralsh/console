import {
  Button,
  Flex,
  FormField,
  Input2,
  ReturnIcon,
  SidePanelOpenIcon,
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
import { useEffect, useMemo, useState } from 'react'
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
import { useWebhookSetupGuidePanel } from '../webhooks/WebhookSetupGuidePanel'
import {
  chatProviderConnectionIcon,
  chatProviderConnectionLabel,
} from './utils'

type RouteState = {
  returnPath?: string
  draftState?: unknown
}

type ChatbotConnectionFormState = {
  name: string
  appToken: string
  botToken: string
}

const SLACK_CHATBOT_SETUP_GUIDE_MARKDOWN_PATH =
  '/setup-guides/chatbots/slack.md'
const SLACK_CHATBOT_SETUP_GUIDE_DOCUMENTATION_URL =
  'https://api.slack.com/apis/connections/socket'

export function ChatbotConnectionForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = location.state as Nullable<RouteState>
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const { popToast } = useSimpleToast()
  const { isOpen, openSetupGuidePanel } = useWebhookSetupGuidePanel()
  const [formState, setFormState] = useState<ChatbotConnectionFormState>({
    name: '',
    appToken: '',
    botToken: '',
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
  const canSave = !!name && !!appToken && !!botToken

  const configuration = {
    slack: {
      appToken,
      botToken,
    },
  }

  const [upsertChatProviderConnection, { loading, error }] =
    useUpsertChatProviderConnectionMutation({
      variables: {
        attributes: {
          name,
          type: ChatProviderConnectionType.Slack,
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

  useEffect(() => {
    if (!isOpen) return

    openSetupGuidePanel({
      documentationUrl: SLACK_CHATBOT_SETUP_GUIDE_DOCUMENTATION_URL,
      markdownPath: SLACK_CHATBOT_SETUP_GUIDE_MARKDOWN_PATH,
    })
  }, [isOpen, openSetupGuidePanel])

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
        css={{ maxWidth: 950, marginInline: 'auto' }}
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
        <Flex gap="medium">
          <Flex
            direction="column"
            width="100%"
          >
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
                  hint="Only Slack is supported for Workbench chatbots currently."
                >
                  <Flex
                    align="center"
                    gap="small"
                    css={{
                      border: '1px solid',
                      borderColor: 'border',
                      borderRadius: 8,
                      padding: '10px 12px',
                    }}
                  >
                    {chatProviderConnectionIcon(
                      ChatProviderConnectionType.Slack
                    )}
                    {chatProviderConnectionLabel(
                      ChatProviderConnectionType.Slack
                    )}
                  </Flex>
                </FormField>
                <FormField
                  required
                  label="Name"
                  hint="Display name shown when selecting this chatbot connection."
                >
                  <Input2
                    value={formState.name}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    disabled={loading}
                  />
                </FormField>
                <FormField
                  required
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
          {!isOpen && (
            <div css={{ width: 200 }}>
              <Button
                secondary
                startIcon={<SidePanelOpenIcon />}
                onClick={() =>
                  openSetupGuidePanel({
                    documentationUrl:
                      SLACK_CHATBOT_SETUP_GUIDE_DOCUMENTATION_URL,
                    markdownPath: SLACK_CHATBOT_SETUP_GUIDE_MARKDOWN_PATH,
                  })
                }
                width="100%"
                css={{ whiteSpace: 'nowrap' }}
              >
                Setup guide
              </Button>
            </div>
          )}
        </Flex>
      </Flex>
    </Flex>
  )
}

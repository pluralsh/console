import {
  Button,
  Flex,
  FormField,
  Input2,
  ReturnIcon,
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

type RouteState = {
  returnPath?: string
  draftState?: unknown
}

type ChatbotConnectionFormState = {
  name: string
  appToken: string
  botToken: string
  botId: string
}

export function ChatbotConnectionForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = location.state as Nullable<RouteState>
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const { popToast } = useSimpleToast()
  const [formState, setFormState] = useState<ChatbotConnectionFormState>({
    name: '',
    appToken: '',
    botToken: '',
    botId: '',
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
  const canSave = !!name && !!appToken && !!botToken

  const [upsertChatProviderConnection, { loading, error }] =
    useUpsertChatProviderConnectionMutation({
      variables: {
        attributes: {
          name,
          type: ChatProviderConnectionType.Slack,
          configuration: {
            slack: {
              appToken,
              botToken,
              botId: botId || null,
            },
          },
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
              label="Chatbot name"
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
            <FormField
              required
              label="Slack app token"
            >
              <Input2
                value={formState.appToken}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    appToken: e.target.value,
                  }))
                }
                placeholder="xapp-..."
                disabled={loading}
              />
            </FormField>
            <FormField
              required
              label="Slack bot token"
            >
              <Input2
                value={formState.botToken}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    botToken: e.target.value,
                  }))
                }
                placeholder="xoxb-..."
                disabled={loading}
              />
            </FormField>
            <FormField label="Slack bot ID">
              <Input2
                value={formState.botId}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, botId: e.target.value }))
                }
                placeholder="B0123456789"
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
    </Flex>
  )
}

import {
  AddIcon,
  Button,
  EmptyState,
  Flex,
  FormField,
  Input2,
  ListBoxFooter,
  ListBoxItem,
  ReturnIcon,
  Select,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useLogin } from 'components/contexts'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StackedText } from 'components/utils/table/StackedText'
import { InlineA } from 'components/utils/typography/Text'
import {
  useChatProviderConnectionsQuery,
  useCreateWorkbenchChatbotMutation,
  useUpdateWorkbenchChatbotMutation,
  useWorkbenchChatbotQuery,
  useWorkbenchQuery,
  WorkbenchChatbotFragment,
} from 'generated/graphql'
import { isEqual } from 'lodash'
import { useMemo, useState } from 'react'
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  getWorkbenchChatbotCreateConnectionAbsPath,
  getWorkbenchChatbotsAbsPath,
  WORKBENCH_PARAM_ID,
  WORKBENCHES_CHATBOT_PARAM_ID,
  WORKBENCHES_CHATBOT_SELECTED_QUERY_PARAM,
} from 'routes/workbenchesRoutesConsts'
import { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { WorkbenchAccessibleUserSelect } from '../WorkbenchAccessibleUserSelect'
import { getWorkbenchBreadcrumbs } from '../Workbench'
import { WorkbenchPromptRichInput } from '../WorkbenchPromptRichInput'
import {
  FormCardSC,
  StickyActionsFooterSC,
} from '../create-edit/WorkbenchCreateOrEdit'
import {
  chatProviderConnectionIcon,
  chatProviderConnectionLabel,
} from './utils'

type ChatbotFormState = {
  chatConnectionId: string
  channel: string
  prompt: string
  userId: string
}

type RouteState = {
  draftState?: ChatbotFormState
}

export function ChatbotForm({ mode }: { mode: 'create' | 'edit' }) {
  const theme = useTheme()
  const { me } = useLogin()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const chatbotId = useParams()[WORKBENCHES_CHATBOT_PARAM_ID]
  const routeState = location.state as Nullable<RouteState>
  const selectedChatbotParam =
    searchParams.get(WORKBENCHES_CHATBOT_SELECTED_QUERY_PARAM) ?? undefined

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

  const {
    data: chatbotData,
    loading: chatbotLoading,
    error: chatbotError,
  } = useWorkbenchChatbotQuery({
    variables: { id: chatbotId ?? '' },
    skip: mode !== 'edit' || !chatbotId,
    fetchPolicy: 'cache-and-network',
  })
  const chatbot = chatbotData?.workbenchChatbot

  const {
    data: connectionsData,
    loading: connectionsLoading,
    error: connectionsError,
  } = useChatProviderConnectionsQuery({
    variables: { first: 100 },
    fetchPolicy: 'cache-and-network',
  })

  const connections = useMemo(
    () => mapExistingNodes(connectionsData?.chatProviderConnections),
    [connectionsData]
  )

  const sourceFormState = useMemo(() => {
    const defaults = getInitialFormState(
      chatbot,
      mode === 'create' ? me?.id : undefined
    )
    const base = routeState?.draftState
      ? { ...defaults, ...routeState.draftState }
      : defaults

    return {
      ...base,
      ...(selectedChatbotParam
        ? { chatConnectionId: selectedChatbotParam }
        : {}),
      userId: base.userId ?? chatbot?.userId ?? me?.id ?? '',
    }
  }, [routeState?.draftState, selectedChatbotParam, chatbot, me?.id, mode])

  const [formDraft, setFormDraft] = useState<Nullable<ChatbotFormState>>(null)
  const formState = formDraft ?? sourceFormState
  const setFormState = (
    updater: (prev: ChatbotFormState) => ChatbotFormState
  ) => {
    setFormDraft((prevDraft) => updater(prevDraft ?? sourceFormState))
  }

  const selectedConnection = connections.find(
    (connection) => connection.id === formState.chatConnectionId
  )
  const label = selectedConnection?.name ?? 'chatbot'
  const channel = formState.channel.trim()
  const prompt = formState.prompt.trim()

  const attributes = {
    chatConnectionId: formState.chatConnectionId,
    channel,
    prompt: prompt || null,
    userId: formState.userId,
  }

  const initialFormState = getInitialFormState(
    chatbot,
    mode === 'create' ? me?.id : undefined
  )
  const canSave =
    !!formState.chatConnectionId &&
    !!channel &&
    !!formState.userId &&
    !isEqual(attributes, getAttributesFromState(initialFormState))

  const { popToast } = useSimpleToast()
  const handleCompleted = () => {
    popToast({
      content: `${label} ${chatbot ? 'updated' : 'created'}`,
      severity: 'success',
    })
    navigate(getWorkbenchChatbotsAbsPath(workbenchId))
  }

  const [createWorkbenchChatbot, createState] =
    useCreateWorkbenchChatbotMutation({
      variables: { workbenchId, attributes },
      onCompleted: handleCompleted,
      refetchQueries: ['WorkbenchChatbots', 'WorkbenchTriggersSummary'],
      awaitRefetchQueries: true,
    })

  const [updateWorkbenchChatbot, updateState] =
    useUpdateWorkbenchChatbotMutation({
      variables: { id: chatbot?.id ?? '', attributes },
      onCompleted: handleCompleted,
      refetchQueries: ['WorkbenchChatbots', 'WorkbenchTriggersSummary'],
      awaitRefetchQueries: true,
    })

  const isSaving = createState.loading || updateState.loading
  const formError = connectionsError ?? createState.error ?? updateState.error

  const handleSave = () => {
    if (!canSave) return
    if (chatbot) updateWorkbenchChatbot()
    else createWorkbenchChatbot()
  }

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getWorkbenchBreadcrumbs(workbench),
        { label: 'chatbots', url: getWorkbenchChatbotsAbsPath(workbenchId) },
        { label: mode === 'create' ? 'create' : 'edit' },
      ],
      [mode, workbench, workbenchId]
    )
  )

  if (workbenchError) return <GqlError error={workbenchError} />

  if (chatbotError) return <GqlError error={chatbotError} />

  if (mode === 'edit' && !chatbotLoading && !chatbot)
    return (
      <EmptyState message="Chatbot not found">
        <Button
          startIcon={<ReturnIcon />}
          onClick={() => navigate(getWorkbenchChatbotsAbsPath(workbenchId))}
        >
          Back to all chatbots
        </Button>
      </EmptyState>
    )

  const isLoading =
    (!workbenchData && workbenchLoading) ||
    (mode === 'edit' && !chatbotData && chatbotLoading)

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
        {isLoading ? (
          <RectangleSkeleton
            $width="100%"
            $height={300}
          />
        ) : (
          <FormCardSC>
            <Flex
              direction="column"
              gap="large"
              height="100%"
              width="100%"
            >
              {formError && <GqlError error={formError} />}
              <Flex
                direction="column"
                gap="medium"
              >
                <FormField
                  required
                  hint="New chatbots added will appear in this list."
                  label="Select chatbot"
                >
                  <Select
                    selectedKey={formState.chatConnectionId || null}
                    isDisabled={isSaving || connectionsLoading}
                    label={selectedConnection?.name ?? 'Select chatbot'}
                    leftContent={
                      selectedConnection
                        ? chatProviderConnectionIcon(selectedConnection.type)
                        : undefined
                    }
                    onSelectionChange={(key) =>
                      setFormState((prev) => ({
                        ...prev,
                        chatConnectionId: key ? String(key) : '',
                      }))
                    }
                  >
                    {[
                      ...connections.map((connection) => (
                        <ListBoxItem
                          key={connection.id}
                          leftContent={chatProviderConnectionIcon(
                            connection.type
                          )}
                          description={chatProviderConnectionLabel(
                            connection.type
                          )}
                          label={connection.name}
                        />
                      )),
                      <ListBoxFooter key="create-chatbot-footer">
                        <InlineA
                          href=""
                          onClick={(e) => {
                            e.preventDefault()
                            navigate(
                              getWorkbenchChatbotCreateConnectionAbsPath(
                                workbenchId
                              ),
                              {
                                state: {
                                  returnPath: `${location.pathname}${location.search}`,
                                  draftState: formState,
                                },
                              }
                            )
                          }}
                          css={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.small,
                          }}
                        >
                          <AddIcon size={14} />
                          Add new chatbot
                        </InlineA>
                      </ListBoxFooter>,
                    ]}
                  </Select>
                </FormField>
                <FormField
                  required
                  label="Attach a channel"
                  hint="Bot will only respond when @mentioned in this channel."
                >
                  <Input2
                    value={formState.channel}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        channel: e.target.value,
                      }))
                    }
                    placeholder="Channel ID or name"
                    disabled={isSaving}
                  />
                </FormField>
                <WorkbenchAccessibleUserSelect
                  key={workbenchId}
                  workbenchId={workbenchId}
                  selectedUserId={formState.userId}
                  onSelectionChange={(userId) =>
                    setFormState((prev) => ({ ...prev, userId }))
                  }
                  disabled={isSaving}
                />
                <FormField
                  label="Prompt"
                  hint="Optional instructions applied before the workbench responds from this chatbot."
                >
                  <WorkbenchPromptRichInput
                    workbenchId={workbenchId}
                    prompt={formState.prompt}
                    onPromptChange={(nextPrompt) =>
                      setFormState((prev) => ({
                        ...prev,
                        prompt: nextPrompt,
                      }))
                    }
                    placeholder="Describe how the agent should respond from this channel"
                    disabled={isSaving}
                    syncKey={`${mode}-${chatbot?.id ?? 'create'}`}
                  />
                </FormField>
              </Flex>
              <StickyActionsFooterSC css={{ justifyContent: 'flex-end' }}>
                <Button
                  secondary
                  startIcon={<ReturnIcon />}
                  onClick={() =>
                    navigate(getWorkbenchChatbotsAbsPath(workbenchId))
                  }
                  disabled={isSaving}
                >
                  Back to all chatbots
                </Button>
                <Button
                  onClick={() => handleSave()}
                  loading={isSaving}
                  disabled={!canSave}
                >
                  Save
                </Button>
              </StickyActionsFooterSC>
            </Flex>
          </FormCardSC>
        )}
      </Flex>
    </Flex>
  )
}

function getInitialFormState(
  chatbot?: Nullable<WorkbenchChatbotFragment>,
  defaultUserId?: Nullable<string>
): ChatbotFormState {
  return {
    chatConnectionId: chatbot?.chatConnection?.id ?? '',
    channel: chatbot?.channel ?? '',
    prompt: chatbot?.prompt ?? '',
    userId: chatbot?.userId ?? defaultUserId ?? '',
  }
}

function getAttributesFromState(formState: ChatbotFormState) {
  const prompt = formState.prompt.trim()

  return {
    chatConnectionId: formState.chatConnectionId,
    channel: formState.channel.trim(),
    prompt: prompt || null,
    userId: formState.userId,
  }
}

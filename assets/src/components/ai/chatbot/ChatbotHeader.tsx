import {
  ArrowLeftIcon,
  BrainIcon,
  Button,
  ChatFilledIcon,
  CloseIcon,
  ComposeIcon,
  ExpandIcon,
  Flex,
  IconFrame,
  Input,
  ListBoxItem,
  Modal,
  RobotIcon,
  Select,
  ShrinkIcon,
  Spinner,
  Toast,
} from '@pluralsh/design-system'
import ClusterSelector from 'components/cd/utils/ClusterSelector'
import { Body1BoldP, CaptionP } from 'components/utils/typography/Text'
import dayjs from 'dayjs'
import {
  AgentSessionType,
  AiInsightFragment,
  ChatThreadTinyFragment,
  useCloudConnectionsQuery,
  useCreateAgentSessionMutation,
  useUpdateChatThreadMutation,
} from 'generated/graphql'
import { useCallback, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { useChatbot } from '../AIContext'
import { AIPinButton } from '../AIPinButton'
import { AIEntryLabel, getThreadOrPinTimestamp } from '../AITableEntry'
import { AISuggestFix } from './AISuggestFix'
import { ChatWithAIButton, insightMessage } from './ChatbotButton'
import { ChatbotThreadMoreMenu } from './ChatbotThreadMoreMenu'

type HeaderState = 'list' | 'thread' | 'insight'

export function ChatbotHeader({
  fullscreen,
  currentThread,
  currentInsight,
}: {
  fullscreen: boolean
  currentThread?: Nullable<ChatThreadTinyFragment>
  currentInsight?: Nullable<AiInsightFragment>
}) {
  const { colors } = useTheme()

  const {
    setFullscreen,
    closeChatbot,
    goToThreadList,
    createNewThread,
    mutationLoading,
    mutationError,
  } = useChatbot()

  const insight = currentThread?.insight || currentInsight
  let state: HeaderState = 'list'
  if (currentThread) state = 'thread'
  else if (insight) state = 'insight'

  const timestamp = getThreadOrPinTimestamp(currentThread)
  const isStale =
    !!timestamp && dayjs().isAfter(dayjs(timestamp).add(24, 'hours'))

  const [
    updateThread,
    { loading: updateThreadLoading, error: updateThreadError },
  ] = useUpdateChatThreadMutation()

  const toggleKnowledgeGraph = useCallback(() => {
    updateThread({
      variables: {
        id: currentThread?.id ?? '',
        attributes: {
          summary: currentThread?.summary ?? '',
          settings: { memory: !currentThread?.settings?.memory },
        },
      },
    })
  }, [currentThread, updateThread])

  const { data: cloudConnections, loading: cloudConnectionsLoading } =
    useCloudConnectionsQuery()
  const connectionId = cloudConnections?.cloudConnections?.edges?.[0]?.node?.id

  const hideClusterSelector =
    currentThread?.session?.type === AgentSessionType.Kubernetes ||
    currentThread?.session?.type === AgentSessionType.Terraform ||
    !currentThread?.session?.id

  return (
    <WrapperSC $fullscreen={fullscreen}>
      {state === 'list' ? (
        <Flex
          alignItems="center"
          gap="small"
          flex={1}
        >
          <IconFrame
            type="floating"
            icon={<ChatFilledIcon color="icon-info" />}
          />
          <Body1BoldP>All threads</Body1BoldP>
        </Flex>
      ) : (
        <>
          <IconFrame
            tooltip="View all threads"
            icon={<ArrowLeftIcon />}
            type="secondary"
            clickable
            onClick={() => goToThreadList()}
          />
          <AIEntryLabel
            insight={insight}
            thread={currentThread}
            isInsight={state === 'insight'}
            isStale={isStale}
          />
        </>
      )}
      {!cloudConnectionsLoading && (
        <>
          {!hideClusterSelector && (
            <div css={{ width: 220 }}>
              <ClusterSelector
                allowDeselect
                onClusterChange={(cluster) => {
                  if (cluster?.id !== currentThread?.session?.cluster?.id)
                    updateThread({
                      variables: {
                        id: currentThread.id,
                        attributes: {
                          summary: currentThread.summary,
                          session: { clusterId: cluster?.id ?? null },
                        },
                      },
                    })
                }}
                clusterId={currentThread?.session?.cluster?.id}
                loading={updateThreadLoading}
                placeholder="Select cluster"
                startIcon={null}
                deselectLabel="Deselect"
                inputProps={{
                  style: {
                    minHeight: fullscreen ? 40 : 32,
                    height: fullscreen ? 40 : 32,
                  },
                }}
              />
            </div>
          )}
          {connectionId && (
            <AgentSessionButton
              connectionId={connectionId}
              fullscreen={fullscreen}
            />
          )}
          <IconFrame
            clickable
            icon={mutationLoading ? <Spinner /> : <ComposeIcon />}
            size={fullscreen ? 'large' : 'medium'}
            type="secondary"
            tooltip="Start a new chat"
            onClick={() =>
              createNewThread({
                summary: 'New chat with Plural Copilot',
                ...(connectionId && {
                  session: {
                    connectionId,
                    done: true,
                  },
                }),
              })
            }
          />
        </>
      )}
      <IconFrame
        {...(fullscreen
          ? { icon: <ShrinkIcon />, size: 'large' }
          : { icon: <ExpandIcon /> })}
        type="secondary"
        tooltip={fullscreen ? 'Collapse' : 'Expand'}
        clickable
        onClick={() => setFullscreen(!fullscreen)}
      />
      {state === 'insight' && (
        <>
          <AIPinButton
            size={fullscreen ? 'large' : 'medium'}
            insight={insight}
            thread={currentThread}
          />
          <ChatWithAIButton
            floating
            iconOnly={!fullscreen}
            insightId={insight?.id}
            messages={[insightMessage(insight)]}
            bodyText="Chat about it"
          />
          <AISuggestFix
            buttonProps={{ iconOnly: !fullscreen }}
            insight={insight}
          />
        </>
      )}
      {state === 'thread' ? (
        <>
          <IconFrame
            tooltip={
              <Flex direction="column">
                <CaptionP $color="text-light">
                  {currentThread?.settings?.memory ? 'Disable' : 'Enable'}
                  {' knowledge graph'}
                </CaptionP>
                <CaptionP $color="text-xlight">
                  {"Use and add to Plural AI's memory with this thread"}
                </CaptionP>
              </Flex>
            }
            clickable
            type="secondary"
            style={{
              borderColor: currentThread?.settings?.memory
                ? colors['border-primary']
                : undefined,
            }}
            size={fullscreen ? 'large' : 'medium'}
            icon={
              updateThreadLoading ? (
                <Spinner css={{ width: 16 }} />
              ) : (
                <BrainIcon css={{ width: 16 }} />
              )
            }
            onClick={toggleKnowledgeGraph}
          />
          <ChatbotThreadMoreMenu fullscreen={fullscreen} />
        </>
      ) : (
        <IconFrame
          clickable
          tooltip="Close"
          type="secondary"
          size={fullscreen ? 'large' : 'medium'}
          icon={<CloseIcon css={{ width: 16 }} />}
          onClick={() => closeChatbot()}
        />
      )}
      <Toast
        show={!!updateThreadError}
        severity="danger"
        position="bottom"
        marginBottom="medium"
      >
        Error updating thread settings.
      </Toast>
      <Toast
        show={!!mutationError}
        closeTimeout={5000}
        severity="danger"
        position="bottom"
        marginBottom="medium"
      >
        <strong>Error creating new thread:</strong> {mutationError?.message}
      </Toast>
    </WrapperSC>
  )
}

function AgentSessionButton({
  connectionId,
  fullscreen,
}: {
  connectionId: string
  fullscreen: boolean
}) {
  const { goToThread } = useChatbot()
  const [showInputModal, setShowInputModal] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [type, setType] = useState(AgentSessionType.Terraform)
  const [
    createAgentSession,
    { loading: agentSessionLoading, error: agentSessionError },
  ] = useCreateAgentSessionMutation({
    variables: { attributes: { connectionId, prompt, type } },
    onCompleted: (data) => {
      if (data.createAgentSession?.id) goToThread(data.createAgentSession.id)
      setShowInputModal(false)
    },
  })
  return (
    <>
      <IconFrame
        clickable
        icon={<RobotIcon />}
        size={fullscreen ? 'large' : 'medium'}
        type="secondary"
        tooltip="Create agent session"
        onClick={() => setShowInputModal(true)}
      />
      <Modal
        header="Set prompt"
        size="large"
        open={showInputModal}
        onClose={() => setShowInputModal(false)}
        asForm
        onSubmit={(e) => {
          e.preventDefault()
          if (!agentSessionLoading) createAgentSession()
        }}
        actions={
          <Button
            type="submit"
            loading={agentSessionLoading}
          >
            Create
          </Button>
        }
      >
        <Flex
          gap="small"
          direction="row"
        >
          <Select
            label="Agent Type"
            selectedKey={type}
            onSelectionChange={(key) => setType(key as AgentSessionType)}
          >
            <ListBoxItem
              key={AgentSessionType.Terraform}
              label="Terraform"
            />
            <ListBoxItem
              key={AgentSessionType.Kubernetes}
              label="Kubernetes"
            />
          </Select>
          <Input
            placeholder="Enter a prompt"
            width="100%"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </Flex>
      </Modal>
      <Toast
        show={!!agentSessionError}
        severity="danger"
        position="bottom"
        marginBottom="medium"
      >
        <strong>Error creating agent session:</strong>{' '}
        {agentSessionError?.message}
      </Toast>
    </>
  )
}

const WrapperSC = styled.div<{ $fullscreen: boolean }>(
  ({ theme, $fullscreen }) => ({
    display: 'flex',
    gap: theme.spacing.small,
    alignItems: 'center',
    padding: theme.spacing.medium,
    ...($fullscreen
      ? {
          border: theme.borders.input,
          borderRadius: theme.borderRadiuses.large,
          background: theme.colors['fill-one'],
        }
      : {
          background: theme.colors['fill-two'],
          borderBottom: theme.borders['fill-two'],
        }),
  })
)

import {
  ArrowLeftIcon,
  BrainIcon,
  ChatFilledIcon,
  CloseIcon,
  ComposeIcon,
  Flex,
  IconFrame,
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
  useUpdateChatThreadMutation,
} from 'generated/graphql'
import { useCallback } from 'react'
import styled, { useTheme } from 'styled-components'
import { useChatbot } from '../AIContext'
import { AIPinButton } from '../AIPinButton'
import { AIEntryLabel, getThreadOrPinTimestamp } from '../AITableEntry'
import { AISuggestFix } from './AISuggestFix'
import { ChatWithAIButton, insightMessage } from './ChatbotButton'
import { ChatbotThreadMoreMenu } from './ChatbotThreadMoreMenu'

type HeaderState = 'list' | 'thread' | 'insight'

export function ChatbotHeader({
  currentThread,
  currentInsight,
}: {
  currentThread?: Nullable<ChatThreadTinyFragment>
  currentInsight?: Nullable<AiInsightFragment>
}) {
  const { colors } = useTheme()

  const {
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
    <WrapperSC>
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
                inputProps={{ style: { minHeight: 32, height: 32 } }}
              />
            </div>
          )}

          <IconFrame
            clickable
            icon={mutationLoading ? <Spinner /> : <ComposeIcon />}
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
      {state === 'insight' && (
        <>
          <AIPinButton
            insight={insight}
            thread={currentThread}
          />
          <ChatWithAIButton
            floating
            iconOnly
            insightId={insight?.id}
            messages={[insightMessage(insight)]}
            bodyText="Chat about it"
          />
          <AISuggestFix
            buttonProps={{ iconOnly: true }}
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
            icon={
              updateThreadLoading ? (
                <Spinner css={{ width: 16 }} />
              ) : (
                <BrainIcon css={{ width: 16 }} />
              )
            }
            onClick={toggleKnowledgeGraph}
          />
          <ChatbotThreadMoreMenu />
        </>
      ) : (
        <IconFrame
          clickable
          tooltip="Close"
          type="secondary"
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

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.small,
  alignItems: 'center',
  padding: theme.spacing.medium,
  background: theme.colors['fill-two'],
  borderBottom: theme.borders['fill-two'],
}))

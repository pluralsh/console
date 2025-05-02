import {
  ArrowLeftIcon,
  BrainIcon,
  ChatFilledIcon,
  CloseIcon,
  ExpandIcon,
  Flex,
  IconFrame,
  ShrinkIcon,
  Spinner,
  Toast,
} from '@pluralsh/design-system'
import { Body1BoldP, CaptionP } from 'components/utils/typography/Text'
import dayjs from 'dayjs'
import {
  AiInsightFragment,
  ChatThreadTinyFragment,
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
  fullscreen,
  currentThread,
  currentInsight,
}: {
  fullscreen: boolean
  currentThread?: Nullable<ChatThreadTinyFragment>
  currentInsight?: Nullable<AiInsightFragment>
}) {
  const { colors } = useTheme()
  const { setFullscreen, closeChatbot, goToThreadList } = useChatbot()
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
      <IconFrame
        {...(fullscreen
          ? { icon: <ShrinkIcon css={{ width: 16 }} />, size: 'large' }
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
    </WrapperSC>
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

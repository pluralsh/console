import {
  ArrowLeftIcon,
  BrainIcon,
  ChatFilledIcon,
  CloseIcon,
  ExpandIcon,
  Flex,
  IconFrame,
  ShrinkIcon,
} from '@pluralsh/design-system'
import dayjs from 'dayjs'
import { AiInsightFragment, ChatThreadTinyFragment } from 'generated/graphql'
import styled from 'styled-components'
import { useChatbot } from '../AIContext'
import { AIPinButton } from '../AIPinButton'
import { AIEntryLabel, getThreadOrPinTimestamp } from '../AITableEntry'
import { ChatWithAIButton, insightMessage } from './ChatbotButton'
import { Body1BoldP } from 'components/utils/typography/Text'
import { AISuggestFix } from './AISuggestFix'
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
  const { setFullscreen, closeChatbot, goToThreadList } = useChatbot()
  const insight = currentThread?.insight || currentInsight
  let state: HeaderState = 'list'
  if (currentThread) state = 'thread'
  else if (insight) state = 'insight'

  const timestamp = getThreadOrPinTimestamp(currentThread)
  const isStale =
    !!timestamp && dayjs().isAfter(dayjs(timestamp).add(24, 'hours'))

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
            clickable
            type="secondary"
            size={fullscreen ? 'large' : 'medium'}
            icon={<BrainIcon css={{ width: 16 }} />}
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

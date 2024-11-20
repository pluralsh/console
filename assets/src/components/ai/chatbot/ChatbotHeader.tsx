import {
  ArrowLeftIcon,
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
import AIPinButton from '../AIPinButton'
import { AIEntryLabel, getThreadOrPinTimestamp } from '../AITableEntry'
import { ChatWithAIButton, insightMessage } from './ChatbotButton'
import { Body1BoldP } from 'components/utils/typography/Text'

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
  const timestamp = getThreadOrPinTimestamp(currentThread)
  const isStale =
    !!timestamp && dayjs().isAfter(dayjs(timestamp).add(24, 'hours'))
  const isShowingList = !currentThread && !currentInsight

  return (
    <WrapperSC $fullscreen={fullscreen}>
      {!isShowingList && (
        <IconFrame
          tooltip="View all threads"
          icon={<ArrowLeftIcon />}
          type="secondary"
          clickable
          onClick={() => goToThreadList()}
        />
      )}
      {isShowingList ? (
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
        <AIEntryLabel
          insight={insight}
          thread={currentThread}
          isInsight={!currentThread}
          isStale={isStale}
        />
      )}
      <IconFrame
        {...(fullscreen
          ? { icon: <ShrinkIcon css={{ width: 16 }} />, size: 'large' }
          : { icon: <ExpandIcon /> })}
        type="secondary"
        clickable
        onClick={() => setFullscreen(!fullscreen)}
      />
      <AIPinButton
        size={fullscreen ? 'large' : 'medium'}
        insight={insight}
        thread={currentThread}
      />
      {!currentThread && insight && fullscreen && (
        <ChatWithAIButton
          insightId={insight.id}
          messages={[insightMessage(insight)]}
          bodyText="Chat about it"
        />
      )}
      <IconFrame
        size={fullscreen ? 'large' : 'medium'}
        icon={<CloseIcon css={{ width: 16 }} />}
        type="secondary"
        clickable
        onClick={() => closeChatbot()}
      />
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

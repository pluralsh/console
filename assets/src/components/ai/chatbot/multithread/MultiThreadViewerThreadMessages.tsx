import { Flex } from '@pluralsh/design-system'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import {
  ChatThreadTinyFragment,
  useChatThreadMessagesQuery,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo } from 'react'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { useChatStreaming } from '../useChatStreaming'
import { MultiThreadViewerMessage } from './MultiThreadViewerMessage'

export function MultiThreadViewerThreadMessages({
  thread,
  isExpectingStream,
}: {
  thread: ChatThreadTinyFragment
  isExpectingStream: boolean
}) {
  const { data, loading, error } = useChatThreadMessagesQuery({
    variables: { id: thread.id },
    fetchPolicy: 'cache-and-network',
  })
  const messages = useMemo(
    () => mapExistingNodes(data?.chatThread?.chats).toReversed(),
    [data?.chatThread?.chats]
  )

  const lastMessageId = messages[messages.length - 1]?.id
  const { streaming, streamedChatFragments } = useChatStreaming({
    threadId: thread.id,
    lastMessageId,
  })

  return (
    <WrapperSC>
      {isEmpty(messages) && isEmpty(streamedChatFragments) ? (
        loading || isExpectingStream ? (
          <Flex
            direction="column"
            gap="small"
          >
            {Array.from({ length: 4 }).map((_, index) => (
              <RectangleSkeleton
                key={index}
                $width={`${100 - [12, 0, 5, 3][index % 4]}%`}
                $height="medium"
              />
            ))}
          </Flex>
        ) : error ? (
          error?.message || ''
        ) : null
      ) : (
        <>
          {messages.map((message) => (
            <MultiThreadViewerMessage
              key={message.id}
              message={message}
            />
          ))}
          {streaming &&
            streamedChatFragments.map((message) => (
              <MultiThreadViewerMessage
                key={message.id}
                message={message}
              />
            ))}
        </>
      )}
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  color: theme.colors['text-long-form'],
  maxHeight: 320,
  overflow: 'auto',
}))

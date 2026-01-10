import { usePrevious } from '@pluralsh/design-system'
import {
  AiDeltaFragment,
  AiRole,
  ChatFragment,
  ChatType,
  useAiChatStreamSubscription,
} from 'generated/graphql'
import { produce } from 'immer'
import { useEffect, useMemo, useState } from 'react'

// TODO, migrate chatbot to use this too
export function useChatStreaming({
  threadId,
  lastMessageId,
}: {
  threadId: string
  lastMessageId?: string
}) {
  const [streaming, setStreaming] = useState(false)
  const [streamedMessages, setStreamedMessages] = useState<AiDeltaFragment[][]>(
    []
  )

  useAiChatStreamSubscription({
    variables: { threadId },
    onData: ({ data: { data } }) => {
      setStreaming(true)
      const newDelta = data?.aiStream
      setStreamedMessages((prev) =>
        produce(prev, (draft) => {
          const msgNum = newDelta?.message ?? 0
          if (!draft[msgNum]) draft[msgNum] = []
          draft[msgNum].push({
            seq: newDelta?.seq ?? 0,
            content: newDelta?.content ?? '',
            role: newDelta?.role ?? AiRole.Assistant,
            tool: newDelta?.tool,
          })
        })
      )
    },
  })

  // reset streaming when new messages are added
  const prevLastMessageId = usePrevious(lastMessageId)
  useEffect(() => {
    if (!lastMessageId || lastMessageId === prevLastMessageId) return
    setStreaming(false)
    setStreamedMessages([])
  }, [lastMessageId, prevLastMessageId])

  const streamedContent = useMemo(
    () =>
      streamedMessages.map((message) =>
        message
          .toSorted((a, b) => a.seq - b.seq)
          .map((delta) => delta.content)
          .join('')
      ),
    [streamedMessages]
  )

  const streamedChatFragments = useMemo<ChatFragment[]>(
    () =>
      streamedMessages.map((message, i) => {
        const tool = message[0]?.tool
        return {
          id: `streaming-${i}`,
          seq: i,
          role: message[0]?.role ?? AiRole.Assistant,
          type: tool ? ChatType.Tool : ChatType.Text,
          content: streamedContent[i],
          attributes: tool ? { tool: { name: tool.name } } : null,
        }
      }),
    [streamedMessages, streamedContent]
  )

  return {
    streaming,
    streamedMessages,
    streamedContent,
    streamedChatFragments,
    setStreaming,
    setStreamedMessages,
  }
}

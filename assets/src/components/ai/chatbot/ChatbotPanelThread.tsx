import { EmptyState, usePrevious } from '@pluralsh/design-system'

import {
  Fragment,
  ReactNode,
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import styled, { useTheme } from 'styled-components'

import { useCanScroll } from 'components/hooks/useCanScroll.ts'
import { GqlError } from 'components/utils/Alert.tsx'
import LoadingIndicator from 'components/utils/LoadingIndicator.tsx'
import {
  AiDelta,
  AiRole,
  ChatThreadTinyFragment,
  EvidenceType,
  useAiChatStreamSubscription,
  useChatMutation,
  useChatThreadDetailsQuery,
  useHybridChatMutation,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { applyNodeToRefs } from 'utils/applyNodeToRefs.ts'
import { mapExistingNodes } from 'utils/graphql.ts'
import { isNonNullable } from 'utils/isNonNullable.ts'
import { ChatbotPanelEvidence } from './ChatbotPanelEvidence.tsx'
import {
  GeneratingResponseMessage,
  SendMessageForm,
} from './ChatbotSendMessageForm.tsx'
import { ChatMessage } from './ChatMessage.tsx'
import { getChatOptimisticResponse, updateChatCache } from './utils.tsx'

export function ChatbotPanelThread({
  currentThread,
  fullscreen,
}: {
  currentThread: ChatThreadTinyFragment
  fullscreen: boolean
}) {
  const theme = useTheme()
  const shouldUseMCP = !!currentThread.flow
  const [streaming, setStreaming] = useState<boolean>(false)
  const messageListRef = useRef<HTMLDivElement>(null)
  const scrollToBottom = useCallback(() => {
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messageListRef])
  const evidence = currentThread.insight?.evidence
    ?.filter(isNonNullable)
    .filter(({ type }) => type === EvidenceType.Log || type === EvidenceType.Pr) // will change when we support alert evidence

  const [streamedMessage, setStreamedMessage] = useState<AiDelta[]>([])
  useAiChatStreamSubscription({
    variables: { threadId: currentThread.id },
    onData: ({ data: { data } }) => {
      setStreaming(true)
      if ((data?.aiStream?.seq ?? 1) % 120 === 0) scrollToBottom()
      setStreamedMessage((streamedMessage) => [
        ...streamedMessage,
        {
          seq: data?.aiStream?.seq ?? 0,
          content: data?.aiStream?.content ?? '',
        },
      ])
    },
  })

  const { data, loading, error } = useChatThreadDetailsQuery({
    variables: { id: currentThread.id },
    pollInterval: 20000,
  })
  const messages = mapExistingNodes(data?.chatThread?.chats)

  const commonChatAttributes = {
    awaitRefetchQueries: true,
    refetchQueries: ['ChatThreadDetails'],
    onCompleted: () => streaming && scrollToBottom(),
  }
  // optimistic response adds the user's message right away, even though technically the mutation returns the AI response
  // forcing the refetch before completion ensures both the user's sent message and AI response exist before overwriting the optimistic response in cache
  // this becomes buggy if you don't use cache-first (default) policy on the details query
  const [mutateRegChat, { loading: regLoading, error: regError }] =
    useChatMutation({
      ...commonChatAttributes,
      optimisticResponse: ({ messages }) =>
        getChatOptimisticResponse({
          mutation: 'chat',
          content: messages?.[0]?.content,
        }),
      update: (cache, { data }) =>
        updateChatCache(currentThread.id, cache, [data?.chat]),
    })
  const [mutateHybridChat, { loading: hybridLoading, error: hybridError }] =
    useHybridChatMutation({
      ...commonChatAttributes,
      optimisticResponse: ({ messages }) =>
        getChatOptimisticResponse({
          mutation: 'hybridChat',
          content: messages?.[0]?.content,
        }),
      update: (cache, { data }) =>
        updateChatCache(currentThread.id, cache, data?.hybridChat ?? []),
    })

  const sendingMessage = regLoading || hybridLoading
  const messageError = regError || hybridError

  // scroll to the bottom when number of messages increases
  const length = messages.length
  const prevLength = usePrevious(length) ?? 0
  useEffect(() => {
    if (length > prevLength) {
      scrollToBottom()
      setStreamedMessage([])
    }
  }, [length, prevLength, scrollToBottom])

  const sendMessage = useCallback(
    (newMessage: string) => {
      const variables = {
        messages: [{ role: AiRole.User, content: newMessage }],
        threadId: currentThread.id,
      }
      if (shouldUseMCP) mutateHybridChat({ variables })
      else mutateRegChat({ variables })
    },
    [currentThread.id, shouldUseMCP, mutateHybridChat, mutateRegChat]
  )

  if (!data && loading)
    return <LoadingIndicator css={{ background: theme.colors['fill-one'] }} />
  if (error) return <GqlError error={error} />

  return (
    <>
      <ChatbotMessagesWrapper
        messageListRef={messageListRef}
        fullscreen={fullscreen}
      >
        {messageError && <GqlError error={messageError} />}
        {isEmpty(messages) && <EmptyState message="No messages yet." />}
        {messages.map((msg) => (
          <Fragment key={msg.id}>
            <ChatMessage {...msg} />
            {!isEmpty(evidence) && // only attaches evidence to the initial insight
              msg.seq === 0 &&
              msg.role === AiRole.Assistant && (
                <ChatbotPanelEvidence evidence={evidence ?? []} />
              )}
          </Fragment>
        ))}
        {sendingMessage &&
          (streamedMessage.length ? (
            <ChatMessage
              disableActions
              role={AiRole.Assistant}
              content={streamedMessage
                .sort((a, b) => a.seq - b.seq)
                .map((delta) => delta.content)
                .join('')}
            />
          ) : (
            <GeneratingResponseMessage />
          ))}
      </ChatbotMessagesWrapper>
      <SendMessageForm
        currentThread={currentThread}
        sendMessage={sendMessage}
        fullscreen={fullscreen}
      />
    </>
  )
}

export const ChatbotMessagesWrapper = ({
  fullscreen,
  messageListRef,
  children,
}: {
  fullscreen: boolean
  messageListRef?: RefObject<HTMLDivElement | null>
  children: ReactNode
}) => {
  const internalRef = useRef<HTMLDivElement>(null)

  const { canScrollDown, canScrollUp } = useCanScroll(internalRef)

  return (
    <ChatbotMessagesWrapperSC $fullscreen={fullscreen}>
      <ScrollGradientSC
        $show={canScrollUp}
        $position="top"
      />
      <ScrollGradientSC
        $show={canScrollDown}
        $position="bottom"
      />
      <ChatbotMessagesListSC
        ref={(node) => applyNodeToRefs([messageListRef, internalRef], node)}
      >
        {children}
      </ChatbotMessagesListSC>
    </ChatbotMessagesWrapperSC>
  )
}

const ChatbotMessagesWrapperSC = styled.div<{ $fullscreen: boolean }>(
  ({ theme, $fullscreen }) => ({
    position: 'relative',
    ...($fullscreen && {
      borderRadius: theme.borderRadiuses.large,
      border: theme.borders.input,
    }),
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.colors['fill-one'],
    overflow: 'hidden',
    padding: `0 ${theme.spacing.xsmall}px`,
    flex: 1,
  })
)

const ChatbotMessagesListSC = styled.div(({ theme }) => ({
  ...theme.partials.reset.list,
  scrollbarWidth: 'none',
  overflowY: 'auto',
  padding: theme.spacing.xsmall,
}))

const ScrollGradientSC = styled.div<{
  $show?: boolean
  $position: 'top' | 'bottom'
}>(({ theme, $show = true, $position }) => ({
  position: 'absolute',
  opacity: $show ? 1 : 0,
  zIndex: 1,
  [$position]: '0',
  transition: 'opacity 0.16s ease-in-out',
  left: 0,
  right: 0,
  height: theme.spacing.xxlarge,
  background: `linear-gradient(${$position === 'top' ? '180deg' : '0deg'}, rgba(42, 46, 55, 0.90) 0%, rgba(42, 46, 55, 0.20) 75%, transparent 100%)`,
  pointerEvents: 'none',
}))

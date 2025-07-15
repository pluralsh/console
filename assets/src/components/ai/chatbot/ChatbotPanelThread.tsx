import { EmptyState, usePrevious } from '@pluralsh/design-system'

import {
  Dispatch,
  Fragment,
  ReactNode,
  RefObject,
  SetStateAction,
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
  ChatThreadDetailsQueryResult,
  ChatThreadFragment,
  ChatType,
  EvidenceType,
  useAiChatStreamSubscription,
  useHybridChatMutation,
} from 'generated/graphql'
import { produce } from 'immer'
import { isEmpty, uniq } from 'lodash'
import { applyNodeToRefs } from 'utils/applyNodeToRefs.ts'
import { mapExistingNodes } from 'utils/graphql.ts'
import { isNonNullable } from 'utils/isNonNullable.ts'
import { ChatbotPanelEvidence } from './ChatbotPanelEvidence.tsx'
import { ChatbotPanelExamplePrompts } from './ChatbotPanelExamplePrompts.tsx'
import {
  GeneratingResponseMessage,
  SendMessageForm,
} from './ChatbotSendMessageForm.tsx'
import { ChatMessage } from './ChatMessage.tsx'
import { getChatOptimisticResponse, updateChatCache } from './utils.tsx'

export function ChatbotPanelThread({
  currentThread,
  fullscreen,
  threadDetailsQuery: { data, loading, error },
  showMcpServers,
  setShowMcpServers,
  showExamplePrompts = false,
  setShowExamplePrompts,
}: {
  currentThread: ChatThreadFragment
  fullscreen: boolean
  threadDetailsQuery: ChatThreadDetailsQueryResult
  showMcpServers: boolean
  setShowMcpServers: Dispatch<SetStateAction<boolean>>
  showExamplePrompts: boolean
  setShowExamplePrompts: Dispatch<SetStateAction<boolean>>
}) {
  const theme = useTheme()
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

  const [streamedMessages, setStreamedMessages] = useState<AiDelta[][]>([])
  useAiChatStreamSubscription({
    variables: { threadId: currentThread.id },
    onData: ({ data: { data } }) => {
      setStreaming(true)
      const newDelta = data?.aiStream
      if ((newDelta?.seq ?? 1) % 120 === 0) scrollToBottom()
      setStreamedMessages((streamedMessages) =>
        produce(streamedMessages, (draft) => {
          const msgNum = newDelta?.message ?? 0
          if (!draft[msgNum]) draft[msgNum] = []
          draft[msgNum].push({
            seq: newDelta?.seq ?? 0,
            content: newDelta?.content ?? '',
            role: newDelta?.role ?? AiRole.Assistant,
          })
        })
      )
    },
  })

  const messages = mapExistingNodes(data?.chatThread?.chats)

  const serverNames = uniq(
    data?.chatThread?.tools?.map((tool) => tool?.server?.name ?? 'Unknown')
  )

  // optimistic response adds the user's message right away, even though technically the mutation returns the AI response
  // forcing the refetch before completion ensures both the user's sent message and AI response exist before overwriting the optimistic response in cache
  const [
    mutateHybridChat,
    { loading: sendingMessage, error: messageError, reset },
  ] = useHybridChatMutation({
    awaitRefetchQueries: true,
    refetchQueries: ['ChatThreadDetails'],
    onCompleted: () => streaming && scrollToBottom(),
    optimisticResponse: ({ messages }) =>
      getChatOptimisticResponse({
        mutation: 'hybridChat',
        content: messages?.[0]?.content,
      }),
    update: (cache, { data }) =>
      updateChatCache(currentThread.id, cache, data?.hybridChat ?? []),
  })

  // reset the mutation when the thread id changes so errors are cleared (like if a new thread is created)
  useEffect(() => {
    reset()
  }, [currentThread.id, reset])

  // scroll to the bottom when number of messages increases
  const length = messages.length
  const prevLength = usePrevious(length) ?? 0
  useEffect(() => {
    if (length > prevLength) {
      scrollToBottom()
      setStreamedMessages([])
    }
  }, [length, prevLength, scrollToBottom])

  const sendMessage = useCallback(
    (newMessage: string) => {
      const variables = {
        messages: [{ role: AiRole.User, content: newMessage }],
        threadId: currentThread.id,
      }
      mutateHybridChat({ variables })
    },
    [currentThread.id, mutateHybridChat]
  )

  if (!data && loading)
    return <LoadingIndicator css={{ background: theme.colors['fill-one'] }} />

  return (
    <>
      <ChatbotMessagesWrapper
        messageListRef={messageListRef}
        fullscreen={fullscreen}
      >
        {isEmpty(messages) &&
          !currentThread.session?.type &&
          (error ? (
            <GqlError error={error} />
          ) : (
            <EmptyState message="No messages yet." />
          ))}
        {messages.map((msg) => (
          <Fragment key={msg.id}>
            <ChatMessage
              {...msg}
              threadId={currentThread.id}
              serverName={msg.server?.name}
            />
            {!isEmpty(evidence) && // only attaches evidence to the initial insight
              msg.seq === 0 &&
              msg.role === AiRole.Assistant && (
                <ChatbotPanelEvidence evidence={evidence ?? []} />
              )}
          </Fragment>
        ))}
        {!isEmpty(streamedMessages) ? (
          streamedMessages.map((message, i) => {
            // TODO: will need to update this
            const isToolCall = message[0]?.role === AiRole.User
            return (
              <ChatMessage
                key={i}
                disableActions
                role={isToolCall ? AiRole.User : AiRole.Assistant}
                type={isToolCall ? ChatType.Tool : ChatType.Text}
                highlightToolContent={false}
                content={message
                  .toSorted((a, b) => a.seq - b.seq)
                  .map((delta) => delta.content)
                  .join('')}
              />
            )
          })
        ) : sendingMessage ? (
          <GeneratingResponseMessage />
        ) : null}
        {messageError && <GqlError error={messageError} />}
        {showExamplePrompts && (
          <ChatbotPanelExamplePrompts
            setShowPrompts={setShowExamplePrompts}
            sendMessage={sendMessage}
          />
        )}
      </ChatbotMessagesWrapper>
      <SendMessageForm
        currentThread={currentThread}
        sendMessage={sendMessage}
        fullscreen={fullscreen}
        serverNames={serverNames}
        showMcpServers={showMcpServers}
        setShowMcpServers={setShowMcpServers}
        showPrompts={showExamplePrompts}
        setShowPrompts={setShowExamplePrompts}
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

export const ChatbotMessagesWrapperSC = styled.div<{ $fullscreen: boolean }>(
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

import { EmptyState, usePrevious } from '@pluralsh/design-system'

import {
  ReactNode,
  Ref,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react'
import styled, { useTheme } from 'styled-components'

import { GqlError } from 'components/utils/Alert.tsx'
import LoadingIndicator from 'components/utils/LoadingIndicator.tsx'
import {
  AiRole,
  ChatFragment,
  ChatThreadDetailsDocument,
  ChatThreadDetailsQuery,
  ChatThreadFragment,
  useChatMutation,
  useChatThreadDetailsQuery,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { appendConnectionToEnd, updateCache } from 'utils/graphql.ts'
import {
  GeneratingResponseMessage,
  SendMessageForm,
} from './ChatbotSendMessageForm.tsx'
import { ChatMessage } from './ChatMessage.tsx'
import { useCanScroll } from 'components/hooks/useCanScroll.ts'
import { mergeRefs } from 'react-merge-refs'

export function ChatbotPanelThread({
  currentThread,
  fullscreen,
}: {
  currentThread: ChatThreadFragment
  fullscreen: boolean
}) {
  const theme = useTheme()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messageListRef = useRef<HTMLUListElement>(null)
  const scrollToBottom = useCallback(() => {
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messageListRef])

  const { data } = useChatThreadDetailsQuery({
    variables: { id: currentThread.id },
  })

  const [mutate, { loading: sendingMessage, error: messageError }] =
    useChatMutation({
      awaitRefetchQueries: true,
      refetchQueries: ['ChatThreadDetails'],
      optimisticResponse: ({ messages }) => ({
        chat: {
          __typename: 'Chat',
          id: crypto.randomUUID(),
          content: messages?.[0]?.content ?? '',
          role: AiRole.User,
          seq: 0,
          insertedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
      update: (cache, { data }) => {
        updateCache(cache, {
          query: ChatThreadDetailsDocument,
          variables: { id: currentThread.id },
          update: (prev: ChatThreadDetailsQuery) => ({
            chatThread: appendConnectionToEnd(
              prev.chatThread,
              data?.chat,
              'chats'
            ),
          }),
        })
      },
    })

  // focus input on initial mount
  useLayoutEffect(() => {
    inputRef.current?.focus()
  }, [])

  // scroll to the bottom when number of messages increases
  const length = data?.chatThread?.chats?.edges?.length ?? 0
  const prevLength = usePrevious(length) ?? 0
  useEffect(() => {
    if (length > prevLength) scrollToBottom()
  }, [length, prevLength, scrollToBottom])

  const sendMessage = useCallback(
    (newMessage: string) => {
      mutate({
        variables: {
          messages: [{ role: AiRole.User, content: newMessage }],
          threadId: currentThread.id,
        },
      })
    },
    [mutate, currentThread]
  )

  if (!data?.chatThread?.chats?.edges)
    return <LoadingIndicator css={{ background: theme.colors['fill-one'] }} />

  const messages = data.chatThread.chats.edges
    .map((edge) => edge?.node)
    .filter((msg): msg is ChatFragment => Boolean(msg))
  return (
    <>
      {messageError && <GqlError error={messageError} />}
      <ChatbotMessagesWrapper
        messageListRef={messageListRef}
        fullscreen={fullscreen}
      >
        {isEmpty(messages) && <EmptyState message="No messages yet." />}
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            {...msg}
          />
        ))}
        {sendingMessage && <GeneratingResponseMessage />}
      </ChatbotMessagesWrapper>
      <SendMessageForm
        sendMessage={sendMessage}
        ref={inputRef}
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
  messageListRef?: Ref<HTMLUListElement>
  children: ReactNode
}) => {
  const internalRef = useRef<HTMLUListElement>(null)
  const combinedRef = mergeRefs([messageListRef, internalRef])

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
      <ChatbotMessagesListSC ref={combinedRef}>
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

const ChatbotMessagesListSC = styled.ul(({ theme }) => ({
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

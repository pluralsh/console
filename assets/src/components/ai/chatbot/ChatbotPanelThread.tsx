import { Flex, usePrevious } from '@pluralsh/design-system'
import { GqlError, GqlErrorType } from 'components/utils/Alert.tsx'
import {
  AiDeltaFragment,
  AiRole,
  ChatFragment,
  ChatType,
  EvidenceType,
  useAiChatStreamSubscription,
  useCreateChatThreadMutation,
  useHybridChatMutation,
} from 'generated/graphql'
import { produce } from 'immer'
import { isEmpty, uniq } from 'lodash'

import LoadingIndicator from 'components/utils/LoadingIndicator.tsx'
import { VirtualList } from 'components/utils/VirtualList.tsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable.ts'
import { VListHandle } from 'virtua'
import { useCommandPaletteMessage } from '../../commandpalette/CommandPalette.tsx'
import TypingIndicator from '../../utils/TypingIndicator.tsx'
import { Body1P } from '../../utils/typography/Text.tsx'
import { useChatbot } from '../AIContext.tsx'
import { ChatbotPanelEvidence } from './ChatbotPanelEvidence.tsx'
import { ChatbotPanelExamplePrompts } from './ChatbotPanelExamplePrompts.tsx'
import { ChatMessage } from './ChatMessage.tsx'
import { ChatInput } from './input/ChatInput.tsx'

export function ChatbotPanelThread({
  messages,
  initLoading,
  error,
  fetchNextPage,
  hasNextPage,
  isLoadingNextPage,
}: {
  messages: ChatFragment[]
  initLoading: boolean
  error: GqlErrorType
  fetchNextPage: () => void
  hasNextPage: boolean
  isLoadingNextPage: boolean
}) {
  const theme = useTheme()
  const { readValue } = useCommandPaletteMessage()
  const { currentThread: curThreadDetails, goToThread } = useChatbot()
  const threadId = curThreadDetails?.id
  const messageListRef = useRef<VListHandle | null>(null)

  const [showExamplePrompts, setShowExamplePrompts] = useState<boolean>(false)

  const [streaming, setStreaming] = useState<boolean>(false)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [streamedMessages, setStreamedMessages] = useState<AiDeltaFragment[][]>(
    []
  )
  useAiChatStreamSubscription({
    variables: { threadId },
    onData: ({ data: { data } }) => {
      setStreaming(true)
      const newDelta = data?.aiStream
      setStreamedMessages((streamedMessages) =>
        produce(streamedMessages, (draft) => {
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

  const { evidence, serverNames } = useMemo(
    () => ({
      evidence: curThreadDetails?.insight?.evidence
        ?.filter(isNonNullable)
        .filter(
          ({ type }) => type === EvidenceType.Log || type === EvidenceType.Pr
        ),
      serverNames: uniq(
        curThreadDetails?.tools?.map((tool) => tool?.server?.name ?? 'Unknown')
      ),
    }),
    [curThreadDetails]
  )

  const scrollToBottom = useCallback(
    () => messageListRef.current?.scrollTo(messageListRef.current.scrollSize),
    []
  )

  const [
    mutateHybridChat,
    { loading: hybridChatLoading, error: hybridChatError, reset },
  ] = useHybridChatMutation({
    awaitRefetchQueries: true,
    refetchQueries: ['ChatThreadMessages', 'ChatThreadDetails'],
    onCompleted: () => scrollToBottom(),
  })
  const [
    createThread,
    { loading: creatingThread, error: creatingThreadError },
  ] = useCreateChatThreadMutation({
    variables: {
      attributes: {
        summary: 'New chat with Plural AI',
        session: { done: true },
      },
    },
  })
  const sendingMessage = hybridChatLoading || creatingThread
  const messageError = hybridChatError || creatingThreadError

  const sendMessage = useCallback(
    (newMessage: string) => {
      scrollToBottom()
      setPendingMessage(newMessage)
      const messages = [{ role: AiRole.User, content: newMessage }]
      if (threadId) mutateHybridChat({ variables: { messages, threadId } })
      else
        createThread({
          onCompleted: ({ createThread }) => {
            if (createThread?.id)
              mutateHybridChat({
                variables: { messages, threadId: createThread.id },
                onCompleted: () => goToThread(createThread.id),
              })
          },
        })
    },
    [scrollToBottom, threadId, mutateHybridChat, createThread, goToThread]
  )

  // runs when new messages are added
  const lastMessageId = messages[messages.length - 1]?.id
  const prevLastMessageId = usePrevious(lastMessageId)
  useEffect(() => {
    if (!lastMessageId || lastMessageId === prevLastMessageId) return

    setStreaming(false)
    setStreamedMessages([])
    setPendingMessage(null)
  }, [lastMessageId, prevLastMessageId])

  // reset the mutation when the thread id changes so errors are cleared (like if a new thread is created)
  useEffect(() => {
    setStreaming(false)
    setStreamedMessages([])
    reset()
  }, [threadId, reset])

  useEffect(() => {
    const commandPalettePendingMessage = readValue()
    if (!commandPalettePendingMessage) return
    sendMessage(commandPalettePendingMessage)
  }, [readValue, sendMessage])

  if (initLoading) return <LoadingIndicator />

  return (
    <Flex
      direction="column"
      position="relative"
      height="100%"
      zIndex={3}
    >
      {messageError && (
        <GqlError
          css={{ margin: theme.spacing.small }}
          error={messageError}
        />
      )}
      <ChatbotMessagesWrapperSC>
        {isEmpty(messages) && !curThreadDetails?.session?.type ? (
          error ? (
            <GqlError error={error} />
          ) : sendingMessage ? (
            <TypingIndicator css={{ marginLeft: theme.spacing.small }} />
          ) : (
            <Body1P css={{ color: theme.colors['text-long-form'] }}>
              How can I help you?
            </Body1P>
          )
        ) : (
          <VirtualList
            isReversed
            listRef={messageListRef}
            data={messages}
            loadNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            isLoadingNextPage={isLoadingNextPage}
            renderer={({ rowData }) => (
              <div>
                <ChatMessage
                  {...rowData}
                  threadId={threadId ?? ''}
                  serverName={rowData.server?.name}
                  session={curThreadDetails?.session}
                />
                {!isEmpty(evidence) && // only attaches evidence to the initial insight
                  rowData.seq === 0 &&
                  rowData.role === AiRole.Assistant && (
                    <ChatbotPanelEvidence evidence={evidence ?? []} />
                  )}
              </div>
            )}
            bottomContent={
              <>
                {pendingMessage && (
                  <ChatMessage
                    role={AiRole.User}
                    type={ChatType.Text}
                    content={pendingMessage}
                    disableActions
                  />
                )}
                {streaming && !isEmpty(streamedMessages) ? (
                  streamedMessages.map((message, i) => {
                    const { tool, role } = message[0] ?? {}
                    return (
                      <ChatMessage
                        key={i}
                        disableActions
                        role={role ?? AiRole.Assistant}
                        type={!!tool ? ChatType.Tool : ChatType.Text}
                        attributes={
                          tool ? { tool: { name: tool.name } } : undefined
                        }
                        highlightToolContent={false}
                        content={message
                          .toSorted((a, b) => a.seq - b.seq)
                          .map((delta) => delta.content)
                          .join('')}
                      />
                    )
                  })
                ) : sendingMessage ||
                  curThreadDetails?.session?.done === false ? (
                  <TypingIndicator css={{ marginLeft: theme.spacing.small }} />
                ) : null}
              </>
            }
          />
        )}
        {showExamplePrompts && (
          <ChatbotPanelExamplePrompts
            setShowPrompts={setShowExamplePrompts}
            sendMessage={sendMessage}
          />
        )}
      </ChatbotMessagesWrapperSC>
      <ChatInput
        sendMessage={sendMessage}
        serverNames={serverNames}
        showPrompts={showExamplePrompts}
        setShowPrompts={setShowExamplePrompts}
      />
    </Flex>
  )
}

export const ChatbotMessagesWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  flex: 1,
  scrollbarWidth: 'none',
  overflowY: 'auto',
  padding: `0 ${theme.spacing.medium}px 0 ${theme.spacing.medium}px`,
  position: 'relative',
  height: '100%',

  // '&:after': {
  //   content: '""',
  //   pointerEvents: 'none',
  //   position: 'absolute',
  //   height: 32,
  //   inset: 0,
  //   zIndex: 1,
  //   background: `linear-gradient(180deg, #0E1015 20.97%, rgba(14, 16, 21, 0) 67.74%)`,
  //   filter: 'drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.25))',
  // },

  // '&:before': {
  //   content: '""',
  //   pointerEvents: 'none',
  //   position: 'absolute',
  //   height: 32,
  //   bottom: 0,
  //   left: 0,
  //   right: 0,
  //   zIndex: 1,
  //   background: `linear-gradient(0deg, #0E1015 20.97%, rgba(14, 16, 21, 0) 67.74%)`,
  //   filter: 'drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.25))',
  // },
}))

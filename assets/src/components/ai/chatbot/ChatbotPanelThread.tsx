import { usePrevious } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert.tsx'
import {
  AgentSession,
  AiDeltaFragment,
  AiRole,
  ChatFragment,
  ChatThreadDetailsQuery,
  ChatThreadFragment,
  ChatType,
  EvidenceType,
  useAiChatStreamSubscription,
  useHybridChatMutation,
} from 'generated/graphql'
import { produce } from 'immer'
import { isEmpty, uniq } from 'lodash'

import { VirtualizedList } from 'components/utils/VirtualizedList.tsx'
import {
  Dispatch,
  RefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql.ts'
import { isNonNullable } from 'utils/isNonNullable.ts'
import { useCommandPaletteMessage } from '../../commandpalette/CommandPalette.tsx'
import { FetchPaginatedDataResult } from '../../utils/table/useFetchPaginatedData.tsx'
import TypingIndicator from '../../utils/TypingIndicator.tsx'
import { Body1P } from '../../utils/typography/Text.tsx'
import { ChatbotPanelEvidence } from './ChatbotPanelEvidence.tsx'
import { ChatbotPanelExamplePrompts } from './ChatbotPanelExamplePrompts.tsx'
import { ChatMessage } from './ChatMessage.tsx'
import { ChatInput } from './input/ChatInput.tsx'

export function ChatbotPanelThread({
  currentThread,
  threadDetailsQuery: { data, loading, error, fetchNextPage },
  showMcpServers,
  setShowMcpServers,
  showExamplePrompts = false,
  setShowExamplePrompts,
}: {
  currentThread: ChatThreadFragment
  threadDetailsQuery: Partial<
    FetchPaginatedDataResult<Nullable<ChatThreadDetailsQuery>>
  >
  showMcpServers: boolean
  setShowMcpServers: Dispatch<SetStateAction<boolean>>
  showExamplePrompts: boolean
  setShowExamplePrompts: Dispatch<SetStateAction<boolean>>
}) {
  const theme = useTheme()
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const { readValue } = useCommandPaletteMessage()
  const [streaming, setStreaming] = useState<boolean>(false)
  const messageListRef = useRef<HTMLDivElement>(null)

  // TODO: figure this out for virtualized list
  const scrollToBottom = useCallback(
    () => messageListRef?.current?.scrollTo({ top: 0, behavior: 'smooth' }),
    [messageListRef]
  )

  const [streamedMessages, setStreamedMessages] = useState<AiDeltaFragment[][]>(
    []
  )
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
            tool: newDelta?.tool,
          })
        })
      )
    },
  })

  const { messages, pageInfo } = useMemo(
    () => ({
      messages: [...mapExistingNodes(data?.chatThread?.chats)].reverse(),
      pageInfo: data?.chatThread?.chats?.pageInfo,
    }),
    [data?.chatThread?.chats]
  )

  const serverNames = uniq(
    data?.chatThread?.tools?.map((tool) => tool?.server?.name ?? 'Unknown')
  )

  const [
    mutateHybridChat,
    { loading: sendingMessage, error: messageError, reset },
  ] = useHybridChatMutation({
    awaitRefetchQueries: true,
    refetchQueries: ['ChatThreadDetails'],
    onCompleted: () => streaming && scrollToBottom(),
  })

  const sendMessage = useCallback(
    (newMessage: string) => {
      setPendingMessage(newMessage)
      const variables = {
        messages: [{ role: AiRole.User, content: newMessage }],
        threadId: currentThread.id,
      }
      mutateHybridChat({ variables })
    },
    [currentThread.id, mutateHybridChat]
  )

  // scroll to bottom when new messages are added
  const lastMessageId = messages[messages.length - 1]?.id
  const prevLastMessageId = usePrevious(lastMessageId)
  useEffect(() => {
    if (!lastMessageId || lastMessageId === prevLastMessageId) return

    scrollToBottom()
    setStreaming(false)
    setStreamedMessages([])
    setPendingMessage(null)
  }, [lastMessageId, prevLastMessageId, scrollToBottom])

  // reset the mutation when the thread id changes so errors are cleared (like if a new thread is created)
  useEffect(() => {
    setStreaming(false)
    setStreamedMessages([])
    reset()
  }, [currentThread.id, reset])

  useEffect(() => {
    const commandPalettePendingMessage = readValue()
    if (!commandPalettePendingMessage) {
      return
    }

    sendMessage(commandPalettePendingMessage)
  }, [readValue, sendMessage])

  return (
    <>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          height: '100%',
        }}
      >
        {messageError && (
          <GqlError
            css={{ margin: theme.spacing.small }}
            error={messageError}
          />
        )}
        <ChatbotMessagesWrapperSC>
          {isEmpty(messages) && !currentThread.session?.type ? (
            error ? (
              <GqlError error={error} />
            ) : (
              <Body1P css={{ color: theme.colors['text-long-form'] }}>
                How can I help you?
              </Body1P>
            )
          ) : (
            <ChatMessageList
              scrollRef={messageListRef}
              messages={messages}
              currentThread={currentThread}
              loading={!!loading}
              pageInfo={pageInfo}
              fetchNextPage={fetchNextPage}
            />
          )}
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
                  attributes={tool ? { tool: { name: tool.name } } : undefined}
                  highlightToolContent={false}
                  content={message
                    .toSorted((a, b) => a.seq - b.seq)
                    .map((delta) => delta.content)
                    .join('')}
                />
              )
            })
          ) : sendingMessage || currentThread.session?.done === false ? (
            <TypingIndicator
              css={{
                marginLeft: theme.spacing.small,
              }}
            />
          ) : null}
        </ChatbotMessagesWrapperSC>
        {showExamplePrompts && (
          <ChatbotPanelExamplePrompts
            setShowPrompts={setShowExamplePrompts}
            sendMessage={sendMessage}
          />
        )}
      </div>
      <ChatInput
        currentThread={currentThread}
        sendMessage={sendMessage}
        serverNames={serverNames}
        showMcpServers={showMcpServers}
        setShowMcpServers={setShowMcpServers}
        showPrompts={showExamplePrompts}
        setShowPrompts={setShowExamplePrompts}
      />
    </>
  )
}

export const ChatMessageList = ({
  messages,
  currentThread,
  scrollRef,
  loading,
  pageInfo,
  fetchNextPage,
}: {
  messages: ChatFragment[]
  currentThread: ChatThreadFragment
  scrollRef?: RefObject<HTMLDivElement | null>
  loading: boolean
  pageInfo: any
  fetchNextPage?: Dispatch<void>
}) => {
  const items = useMemo(() => {
    return messages.reverse()
  }, [messages])
  const evidence = currentThread.insight?.evidence
    ?.filter(isNonNullable)
    .filter(({ type }) => type === EvidenceType.Log || type === EvidenceType.Pr)

  return (
    <VirtualizedList
      items={items}
      estimateSize={82}
      overscan={1}
      renderItem={(msg, index) => (
        <div data-index={index}>
          <ChatMessage
            {...msg}
            threadId={currentThread.id}
            serverName={msg.server?.name}
            session={currentThread.session as AgentSession}
          />
          {!isEmpty(evidence) && // only attaches evidence to the initial insight
            msg.seq === 0 &&
            msg.role === AiRole.Assistant && (
              <ChatbotPanelEvidence evidence={evidence ?? []} />
            )}
        </div>
      )}
    />
  )
}

export const ChatbotMessagesWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  flex: 1,
  scrollbarWidth: 'none',
  overflowY: 'auto',
  padding: theme.spacing.medium,
  height: '100%',
}))

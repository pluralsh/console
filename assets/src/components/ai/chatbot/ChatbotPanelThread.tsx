import { usePrevious, useResizeObserver } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert.tsx'
import {
  AgentSession,
  AiDeltaFragment,
  AiRole,
  ChatThreadDetailsQuery,
  ChatThreadFragment,
  ChatType,
  EvidenceType,
  useAiChatStreamSubscription,
  useHybridChatMutation,
} from 'generated/graphql'
import { produce } from 'immer'
import { isEmpty, uniq } from 'lodash'

import {
  Dispatch,
  Fragment,
  ReactNode,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { VariableSizeList } from 'react-window'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql.ts'
import { isNonNullable } from 'utils/isNonNullable.ts'
import { useCommandPaletteMessage } from '../../commandpalette/CommandPalette.tsx'
import SmoothScroller from '../../utils/SmoothScroller.tsx'
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
  const [messageListRef, setMessageListRef] = useState<VariableSizeList>()
  const scrollToBottom = useCallback(
    () => messageListRef?.scrollToItem(0),
    [messageListRef]
  )
  const evidence = currentThread.insight?.evidence
    ?.filter(isNonNullable)
    .filter(({ type }) => type === EvidenceType.Log || type === EvidenceType.Pr) // will change when we support alert evidence

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
        <ChatbotMessagesWrapper
          messageListRef={messageListRef}
          setMessageListRef={setMessageListRef}
          loading={!!loading}
          pageInfo={pageInfo}
          fetchNextPage={fetchNextPage}
        >
          {isEmpty(messages) &&
            !currentThread.session?.type &&
            (error ? (
              <GqlError error={error} />
            ) : (
              <Body1P css={{ color: theme.colors['text-long-form'] }}>
                How can I help you?
              </Body1P>
            ))}
          {messages.map((msg) => (
            <Fragment key={msg.id}>
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
            </Fragment>
          ))}
          {pendingMessage && (
            <Fragment key="pending-message">
              <ChatMessage
                role={AiRole.User}
                type={ChatType.Text}
                content={pendingMessage}
                disableActions
              />
            </Fragment>
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
        </ChatbotMessagesWrapper>
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

export const ChatbotMessagesWrapper = ({
  messageListRef,
  setMessageListRef,
  children,
  loading,
  pageInfo,
  fetchNextPage,
}: {
  messageListRef: VariableSizeList | undefined
  setMessageListRef: Dispatch<SetStateAction<VariableSizeList | undefined>>
  children: ReactNode | Array<ReactNode>
  loading: boolean
  pageInfo: any
  fetchNextPage?: Dispatch<void>
}) => {
  const items = useMemo(() => {
    if (isEmpty(children)) return []
    if (!Array.isArray(children)) return [children]

    return children
      .filter((child) => !isEmpty(child))
      .flatMap((child) => {
        if (Array.isArray(child)) return child
        return [child]
      })
      .reverse()
  }, [children])

  return (
    <ChatbotMessagesWrapperSC>
      <SmoothScroller
        listRef={messageListRef}
        setListRef={setMessageListRef}
        items={items}
        loading={loading}
        hasNextPage={pageInfo?.hasNextPage}
        mapper={(child, _, { index, setSize }) => (
          <ChatbotMessage
            handleHeightChange={(height) => setSize(index, height)}
            idx={index}
          >
            {child}
          </ChatbotMessage>
        )}
        loadNextPage={fetchNextPage}
        handleScroll={undefined}
        placeholder={undefined}
        refreshKey={undefined}
        setLoader={undefined}
      />
    </ChatbotMessagesWrapperSC>
  )
}

function ChatbotMessage({
  handleHeightChange,
  idx,
  children,
}: {
  handleHeightChange: (idx: number, height: number) => void
  idx: number
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const prevHeight = useRef<number | null>(null)

  useResizeObserver(ref, (entry) => {
    const height = entry.height
    if (prevHeight.current !== height) {
      prevHeight.current = height
      handleHeightChange(idx, height)
    }
  })

  return <div ref={ref}>{children}</div>
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

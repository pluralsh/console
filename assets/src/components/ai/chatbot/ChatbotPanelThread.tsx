import { usePrevious, useResizeObserver } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert.tsx'
import LoadingIndicator from 'components/utils/LoadingIndicator.tsx'
import {
  AgentSession,
  AiDeltaFragment,
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

import {
  Dispatch,
  Fragment,
  ReactElement,
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
import { extendConnection, mapExistingNodes } from 'utils/graphql.ts'
import { isNonNullable } from 'utils/isNonNullable.ts'
import SmoothScroller from '../../utils/SmoothScroller.tsx'
import { Body1P } from '../../utils/typography/Text.tsx'
import { ChatbotPanelEvidence } from './ChatbotPanelEvidence.tsx'
import { ChatbotPanelExamplePrompts } from './ChatbotPanelExamplePrompts.tsx'
import { ChatMessage } from './ChatMessage.tsx'
import { ChatInput, GeneratingResponseMessage } from './input/ChatInput.tsx'
import { getChatOptimisticResponse, updateChatCache } from './utils.tsx'

export function ChatbotPanelThread({
  currentThread,
  threadDetailsQuery: { data, loading, error, fetchMore },
  showMcpServers,
  setShowMcpServers,
  showExamplePrompts = false,
  setShowExamplePrompts,
}: {
  currentThread: ChatThreadFragment
  threadDetailsQuery: ChatThreadDetailsQueryResult
  showMcpServers: boolean
  setShowMcpServers: Dispatch<SetStateAction<boolean>>
  showExamplePrompts: boolean
  setShowExamplePrompts: Dispatch<SetStateAction<boolean>>
}) {
  const theme = useTheme()
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
      messages: mapExistingNodes(data?.chatThread?.chats),
      pageInfo: data?.chatThread?.chats?.pageInfo,
    }),
    [data?.chatThread?.chats]
  )

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

  const reverseMessages = useMemo(() => [...messages].reverse(), [messages])

  if (!data && loading)
    return <LoadingIndicator css={{ background: theme.colors['fill-one'] }} />

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
          loading={loading}
          pageInfo={pageInfo}
          fetchMore={fetchMore}
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
          {reverseMessages.map((msg) => (
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
          {!isEmpty(streamedMessages) ? (
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
            <GeneratingResponseMessage />
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
  fetchMore,
}: {
  messageListRef: VariableSizeList | undefined
  setMessageListRef: Dispatch<SetStateAction<VariableSizeList | undefined>>
  children: ReactNode | Array<ReactNode>
  loading: boolean
  pageInfo: any
  fetchMore: any
}) => {
  const DEFAULT_ITEM_SIZE = 100
  const [itemHeights, setItemHeights] = useState<number[]>([])
  const handleHeightChange = useCallback(
    (idx: number, height: number) => {
      setItemHeights((heights) => {
        const next = [...heights]
        next[idx] = height
        return next
      })
      messageListRef?.resetAfterIndex(idx)
    },
    [messageListRef]
  )

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
        itemSize={(index) => itemHeights[index] ?? DEFAULT_ITEM_SIZE}
        loading={loading}
        hasNextPage={pageInfo?.hasNextPage}
        mapper={(child, _, { index }) => (
          <ChatbotMessage
            handleHeightChange={handleHeightChange}
            idx={index}
          >
            {child}
          </ChatbotMessage>
        )}
        loadNextPage={() =>
          pageInfo?.hasNextPage &&
          fetchMore({
            variables: { after: pageInfo?.endCursor },
            updateQuery: (prev, { fetchMoreResult }) => {
              if (!prev.chatThread) return prev

              return {
                ...prev,
                chatThread: extendConnection(
                  prev.chatThread,
                  fetchMoreResult.chatThread?.chats,
                  'chats'
                ),
              }
            },
          })
        }
        handleScroll={undefined}
        placeholder={undefined}
        refreshKey={undefined}
        setLoader={undefined}
      />
    </ChatbotMessagesWrapperSC>
  )
}

function ChatbotMessage({ handleHeightChange, idx, children }): ReactElement {
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

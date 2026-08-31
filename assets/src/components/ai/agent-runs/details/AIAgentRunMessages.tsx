import { ChatMessage } from 'components/ai/chatbot/ChatMessage'
import {
  ChatDisplayItem,
  ChatToolCallGroup,
  groupConsecutiveToolMessages,
} from 'components/ai/chatbot/ChatToolCallGroup'
import { VirtualList } from 'components/utils/VirtualList'
import {
  AgentMessageFragment,
  AgentMessageToolState,
  AgentRunFragment,
  AgentRunStatus,
  AiRole,
  ChatFragment,
  ChatType,
  useAgentMessageOutputDeltaSubscription,
  useAgentRunChatSubscription,
} from 'generated/graphql'
import { produce } from 'immer'
import { isEmpty } from 'lodash'
import { useEffect, useMemo, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { AILoadingText } from 'components/utils/AILoadingText'
import { duration } from 'utils/datetime'

const MAX_STREAMED_OUTPUT_LENGTH = 1 << 20

export function AIAgentRunMessages({ run }: { run: AgentRunFragment }) {
  const { spacing, colors, mode, borders, boxShadows } = useTheme()

  const [subscribedMessages, setSubscribedMessages] = useState<
    AgentMessageFragment[]
  >([])
  const [stdoutByMessageId, setStdoutByMessageId] = useState<
    Record<string, string>
  >({})

  const isRunning =
    run?.status === AgentRunStatus.Running ||
    run?.status === AgentRunStatus.Pending

  useAgentRunChatSubscription({
    skip: !isRunning,
    variables: { runId: run.id },
    onData: ({ data: { data } }) => {
      const payload = data?.agentMessageDelta?.payload
      if (!payload) return

      const state = payload.metadata?.tool?.state
      if (
        state === AgentMessageToolState.Completed ||
        state === AgentMessageToolState.Error
      ) {
        setStdoutByMessageId((prev) => {
          if (!(payload.id in prev)) return prev
          const next = { ...prev }
          delete next[payload.id]
          return next
        })
      }

      setSubscribedMessages(
        produce((messages) => {
          const idx = messages.findIndex((m) => m.id === payload.id)
          if (idx >= 0) messages[idx] = payload
          else messages.push(payload)
        })
      )
    },
  })

  useAgentMessageOutputDeltaSubscription({
    skip: !isRunning,
    variables: { runId: run.id },
    onData: ({ data: { data } }) => {
      const payload = data?.agentMessageOutputDelta?.payload
      if (!payload?.messageId || !payload.stdout) return
      setStdoutByMessageId((prev) => {
        const stdout = (prev[payload.messageId] ?? '') + payload.stdout
        return {
          ...prev,
          [payload.messageId]: stdout.slice(-MAX_STREAMED_OUTPUT_LENGTH),
        }
      })
    },
  })

  // Merge by id (subscribed wins for updates), then restore conversation order by seq.
  const agentMessages = useMemo(() => {
    const byId = new Map<string, AgentMessageFragment>()
    for (const msg of [...(run.messages ?? []), ...subscribedMessages]) {
      if (msg && !isHiddenAgentMessage(msg)) byId.set(msg.id, msg)
    }
    return Array.from(byId.values()).sort((a, b) => a.seq - b.seq)
  }, [subscribedMessages, run.messages])

  const messages: ChatFragment[] = useMemo(
    () =>
      agentMessages.map((msg) =>
        agentMsgToChatMsg(msg, stdoutByMessageId[msg.id])
      ),
    [agentMessages, stdoutByMessageId]
  )

  const displayItems: ChatDisplayItem[] = useMemo(
    () =>
      groupConsecutiveToolMessages(
        isEmpty(messages) ? [getMockUserChat(run.prompt)] : messages
      ),
    [messages, run.prompt]
  )

  const hasPendingTool = useMemo(
    () =>
      agentMessages.some((msg) => {
        const state = msg.metadata?.tool?.state
        return (
          state === AgentMessageToolState.Running ||
          state === AgentMessageToolState.Pending
        )
      }),
    [agentMessages]
  )

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!hasPendingTool) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [hasPendingTool])

  const getToolMessageProps = (id?: string | null) => {
    const agent = agentMessages.find((m) => m.id === id)
    const state = agent?.metadata?.tool?.state
    const isPending =
      state === AgentMessageToolState.Running ||
      state === AgentMessageToolState.Pending

    return {
      isPending,
      toolRuntime: toolRuntimeLabel(
        agent?.metadata?.startedAt ?? agent?.insertedAt,
        agent?.metadata?.completedAt,
        isPending,
        now
      ),
    }
  }

  return (
    <MessagesStreamWrapperSC>
      <VirtualList
        isReversed
        data={displayItems}
        getRowId={(row) =>
          Array.isArray(row) ? (row[0]?.id ?? 'tool-group') : (row.id ?? '')
        }
        itemGap="small"
        style={{
          padding: `0 ${spacing.large}px ${spacing.large}px`,
        }}
        renderer={({ rowData }) =>
          Array.isArray(rowData) ? (
            <ChatToolCallGroup
              messages={rowData}
              isRunning={isRunning}
              chatMessageProps={chatMessagePropsShared}
              getChatMessageProps={(message) => getToolMessageProps(message.id)}
            />
          ) : (
            <ChatMessage
              {...rowData}
              {...chatMessagePropsShared}
              {...getToolMessageProps(rowData.id)}
              userMsgWrapperStyle={{
                backgroundColor:
                  mode === 'light' ? colors['fill-two'] : colors['fill-one'],
                ...(mode === 'light'
                  ? {
                      border: borders.input,
                      borderColor: colors['border-input'],
                      boxShadow: boxShadows.slight,
                    }
                  : { borderColor: colors['border-fill-one'] }),
                '& *': { color: colors.text },
              }}
            />
          )
        }
        bottomContent={isRunning && <AILoadingText defaultText="Thinking" />}
      />
    </MessagesStreamWrapperSC>
  )
}

const MessagesStreamWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.small,
  flexDirection: 'column',
  flex: '1 1 0',
  minHeight: 0,
  overflow: 'hidden',
  borderRadius: theme.borderRadiuses.large,
  background: theme.colors['fill-zero'],
}))

const chatMessagePropsShared = {
  disableActions: 'no-spacing' as const,
  toolDisplayType: 'simple' as const,
  style: { padding: 0, overflow: 'visible' },
}

const isHiddenAgentMessage = (msg: AgentMessageFragment) =>
  msg.message === '__plrl_ignore__' &&
  !msg.metadata?.tool &&
  !msg.metadata?.file

const overlayToolOutput = (
  msg: AgentMessageFragment,
  streamedStdout?: string
) => {
  const state = msg.metadata?.tool?.state
  const pending =
    state === AgentMessageToolState.Running ||
    state === AgentMessageToolState.Pending
  if (pending) return streamedStdout
  return msg.metadata?.tool?.output
}

const agentMsgToChatMsg = (
  msg: AgentMessageFragment,
  streamedStdout?: string
): ChatFragment => ({
  id: msg.id,
  seq: msg.seq,
  role: msg.role,
  insertedAt: msg.insertedAt,
  content: msg.metadata?.tool
    ? overlayToolOutput(msg, streamedStdout)
    : msg.metadata?.file
      ? msg.metadata.file.text
      : msg.message,
  type: msg.metadata?.tool
    ? ChatType.Tool
    : msg.metadata?.file
      ? ChatType.File
      : ChatType.Text,
  attributes: {
    file: { name: msg.metadata?.file?.name },
    tool: {
      name: msg.metadata?.tool?.name,
      arguments: safeJsonParse(msg.metadata?.tool?.input),
    },
  },
})

const getMockUserChat = (msg: string): ChatFragment => ({
  id: '0',
  seq: 0,
  role: AiRole.User,
  type: ChatType.Text,
  content: msg,
})

const safeJsonParse = (str: Nullable<string>) => {
  if (!str) return undefined
  try {
    return JSON.parse(str)
  } catch {
    return undefined
  }
}

function toolRuntimeLabel(
  startedAt?: string | null,
  completedAt?: string | null,
  isPending?: boolean,
  now?: number
) {
  if (!startedAt) return undefined
  if (completedAt) return duration(startedAt, completedAt)
  if (isPending && now != null) return duration(startedAt, now)
  return undefined
}

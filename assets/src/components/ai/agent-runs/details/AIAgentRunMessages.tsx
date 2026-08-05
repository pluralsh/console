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
  useAgentRunChatSubscription,
} from 'generated/graphql'
import { produce } from 'immer'
import { isEmpty } from 'lodash'
import { useMemo, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { AILoadingText } from 'components/utils/AILoadingText'
import { duration } from 'utils/datetime'

export function AIAgentRunMessages({ run }: { run: AgentRunFragment }) {
  const { spacing, colors } = useTheme()

  const [subscribedMessages, setSubscribedMessages] = useState<
    AgentMessageFragment[]
  >([])
  const isRunning =
    run?.status === AgentRunStatus.Running ||
    run?.status === AgentRunStatus.Pending

  useAgentRunChatSubscription({
    skip: !isRunning,
    variables: { runId: run.id },
    onData: ({ data: { data } }) => {
      const payload = data?.agentMessageDelta?.payload
      if (!payload) return

      setSubscribedMessages(
        produce((messages) => {
          const idx = messages.findIndex((m) => m.id === payload.id)
          if (idx >= 0) messages[idx] = payload
          else messages.push(payload)
        })
      )
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
    () => agentMessages.map(agentMsgToChatMsg),
    [agentMessages]
  )

  const displayItems: ChatDisplayItem[] = useMemo(
    () =>
      groupConsecutiveToolMessages(
        isEmpty(messages) ? [getMockUserChat(run.prompt)] : messages
      ),
    [messages, run.prompt]
  )

  const getToolMessageProps = (id?: string | null) => {
    const agent = agentMessages.find((m) => m.id === id)
    const state = agent?.metadata?.tool?.state
    const isPending =
      state === AgentMessageToolState.Running ||
      state === AgentMessageToolState.Pending

    return {
      isPending,
      toolRuntime:
        agent?.insertedAt && agent.metadata?.completedAt
          ? duration(agent.insertedAt, agent.metadata.completedAt)
          : undefined,
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
                background: colors['fill-one'],
                borderColor: colors['border-fill-one'],
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
  style: { padding: 0 },
}

const isHiddenAgentMessage = (msg: AgentMessageFragment) =>
  msg.message === '__plrl_ignore__' &&
  !msg.metadata?.tool &&
  !msg.metadata?.file

const agentMsgToChatMsg = (msg: AgentMessageFragment): ChatFragment => ({
  id: msg.id,
  seq: msg.seq,
  role: msg.role,
  insertedAt: msg.insertedAt,
  content: msg.metadata?.tool
    ? msg.metadata.tool.output
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

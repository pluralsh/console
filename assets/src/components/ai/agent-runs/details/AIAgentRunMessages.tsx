import { ChatMessage } from 'components/ai/chatbot/ChatMessage'
import {
  ChatDisplayItem,
  ChatToolCallGroup,
  groupConsecutiveToolMessages,
} from 'components/ai/chatbot/ChatToolCallGroup'
import { VirtualList } from 'components/utils/VirtualList'
import {
  AgentMessageFragment,
  AgentRunFragment,
  AgentRunStatus,
  AiRole,
  ChatFragment,
  ChatType,
  useAgentRunChatSubscription,
} from 'generated/graphql'
import { produce } from 'immer'
import { isEmpty, uniqWith } from 'lodash'
import { useMemo, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { AILoadingText } from 'components/utils/AILoadingText'

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
      setSubscribedMessages(
        produce(subscribedMessages, (messages) => {
          const payload = data?.agentMessageDelta?.payload
          if (payload) messages.push(payload)
        })
      )
    },
  })

  const messages: ChatFragment[] = useMemo(
    () =>
      uniqWith(
        (run.messages ?? [])
          .concat(subscribedMessages)
          .filter(isNonNullable)
          .map(agentMsgToChatMsg),
        (a, b) => a.id === b.id
      ),
    [subscribedMessages, run.messages]
  )

  const displayItems: ChatDisplayItem[] = useMemo(
    () =>
      groupConsecutiveToolMessages(
        isEmpty(messages) ? [getMockUserChat(run.prompt)] : messages
      ),
    [messages, run.prompt]
  )

  return (
    <MessagesStreamWrapperSC>
      <VirtualList
        isReversed
        data={displayItems}
        getRowId={(row) =>
          Array.isArray(row) ? (row[0]?.id ?? 'tool-group') : (row.id ?? '')
        }
        itemGap="small"
        style={{ padding: `${spacing.large}px ${spacing.xxxlarge}px` }}
        renderer={({ rowData }) =>
          Array.isArray(rowData) ? (
            <ChatToolCallGroup
              messages={rowData}
              isRunning={isRunning}
              chatMessageProps={chatMessagePropsShared}
            />
          ) : (
            <ChatMessage
              {...rowData}
              {...chatMessagePropsShared}
              userMsgWrapperStyle={{
                background: colors['fill-two'],
                borderColor: colors['border-fill-two'],
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
  flex: 1,
  minHeight: 610,
  border: theme.borders.default,
  borderRadius: theme.borderRadiuses.large,
  background: theme.colors['fill-one'],
}))

const chatMessagePropsShared = {
  disableActions: 'no-spacing' as const,
  toolDisplayType: 'simple' as const,
  style: { padding: 0 },
}

const agentMsgToChatMsg = (msg: AgentMessageFragment): ChatFragment => ({
  id: msg.id,
  seq: msg.seq,
  role: msg.role,
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

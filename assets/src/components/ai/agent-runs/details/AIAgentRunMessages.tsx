import { ChatMessage } from 'components/ai/chatbot/ChatMessage'
import TypingIndicator from 'components/utils/TypingIndicator'
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

  return (
    <GradientWrapperSC>
      <VirtualList
        isReversed
        data={isEmpty(messages) ? [getMockUserChat(run.prompt)] : messages}
        itemGap="small"
        style={{ padding: `${spacing.large}px ${spacing.xxxlarge}px` }}
        renderer={({ rowData }) => (
          <ChatMessage
            {...rowData}
            disableActions="no-spacing"
            toolDisplayType="simple"
            css={{ padding: 0 }}
            userMsgWrapperStyle={{
              background: colors['fill-two'],
              borderColor: colors['border-fill-two'],
              '& *': { color: colors.text },
            }}
          />
        )}
        bottomContent={
          isRunning && (
            <TypingIndicator
              css={{ marginRight: spacing.small, justifyContent: 'flex-start' }}
            />
          )
        }
      />
    </GradientWrapperSC>
  )
}

const GradientWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.small,
  flexDirection: 'column',
  flex: 1,
  minHeight: 610,
  border: theme.borders.default,
  borderRadius: theme.borderRadiuses.large,
  background: `linear-gradient(180deg, rgba(0, 0, 0, 0.00) 0%, rgba(74, 81, 242, 0.13) 100%)`,
}))

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

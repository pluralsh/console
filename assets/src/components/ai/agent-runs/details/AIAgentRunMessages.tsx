import { Flex } from '@pluralsh/design-system'
import { ChatMessage } from 'components/ai/chatbot/ChatMessage'
import { SimpleAccordion } from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import { EaseIn } from 'components/utils/EaseIn'
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
import { countBy, isEmpty, sumBy, uniqWith } from 'lodash'
import pluralize from 'pluralize'
import { useMemo, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { AILoadingText } from 'components/utils/AILoadingText'

type DisplayItem = ChatFragment | ChatFragment[]

const BATCHED_TOOLS = ['bash', 'read', 'grep', 'edit'] as const

export const AI_GRADIENT_BG = `linear-gradient(180deg, rgba(0, 0, 0, 0.00) 0%, rgba(74, 81, 242, 0.05) 100%)`

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

  const displayItems: DisplayItem[] = useMemo(
    () =>
      groupConsecutiveToolMessages(
        isEmpty(messages) ? [getMockUserChat(run.prompt)] : messages
      ),
    [messages, run.prompt]
  )

  return (
    <GradientWrapperSC>
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
            <ToolCallGroup
              messages={rowData}
              isRunning={isRunning}
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
    </GradientWrapperSC>
  )
}

function ToolCallGroup({
  messages,
  isRunning,
}: {
  messages: ChatFragment[]
  isRunning: boolean
}) {
  const { spacing } = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)
  const lastMessage = messages.at(-1)
  const header = useMemo(() => {
    const counts = countBy(messages, (m) =>
      m.attributes?.tool?.name?.toLowerCase()
    )
    const other = messages.length - sumBy(BATCHED_TOOLS, (t) => counts[t] ?? 0)
    return [
      other > 0 && `${other} tool ${pluralize('call', other)}`,
      ...BATCHED_TOOLS.filter((t) => counts[t]).map(
        (t) => `${counts[t]} ${pluralize(t, counts[t])}`
      ),
    ]
      .filter(Boolean)
      .join(', ')
  }, [messages])

  return (
    <>
      <SimpleAccordion
        label={header}
        loading={false}
        isOpen={isExpanded}
        setIsOpen={setIsExpanded}
        caret="right-quarter-mirror"
        triggerWrapperStyles={{
          justifyContent: 'flex-start',
          '.icon': { width: 10 },
        }}
      >
        <Flex
          direction="column"
          gap="xsmall"
          marginTop={spacing.xsmall}
        >
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              {...message}
              {...chatMessagePropsShared}
            />
          ))}
        </Flex>
      </SimpleAccordion>
      {!isExpanded && lastMessage && isRunning && (
        <EaseIn currentKey={lastMessage.id}>
          <ChatMessage
            {...lastMessage}
            {...chatMessagePropsShared}
          />
        </EaseIn>
      )}
    </>
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
  background: AI_GRADIENT_BG,
}))

function groupConsecutiveToolMessages(messages: ChatFragment[]): DisplayItem[] {
  const result: DisplayItem[] = []
  messages.forEach((msg) => {
    if (msg.type !== ChatType.Tool) {
      result.push(msg)
      return
    }
    const last = result.at(-1)
    if (Array.isArray(last)) last.push(msg)
    else result.push([msg])
  })
  return result
}

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

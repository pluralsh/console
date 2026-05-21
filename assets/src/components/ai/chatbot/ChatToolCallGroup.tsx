import { Flex } from '@pluralsh/design-system'
import { EaseIn } from 'components/utils/EaseIn'
import { ChatFragment, ChatType } from 'generated/graphql'
import { countBy, sumBy } from 'lodash'
import pluralize from 'pluralize'
import { ComponentProps, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import { ChatMessage } from './ChatMessage'
import { SimpleAccordion } from './multithread/MultiThreadViewerMessage'
import {
  resolveToolCallKind,
  toolCallBatchKey,
  toolCallBatchLabelFromKey,
} from './toolCallDisplay'

export type ChatDisplayItem = ChatFragment | ChatFragment[]

const BATCHED_TOOL_KEYS = [
  'bash',
  'read',
  'grep',
  'edit',
  'command',
  'mcp',
  'files',
  'search',
] as const

export function ChatToolCallGroup({
  messages,
  isRunning,
  chatMessageProps,
  getChatMessageProps,
}: {
  messages: ChatFragment[]
  isRunning?: boolean
  chatMessageProps?: Partial<ComponentProps<typeof ChatMessage>>
  getChatMessageProps?: (
    message: ChatFragment
  ) => Partial<ComponentProps<typeof ChatMessage>>
}) {
  const { spacing } = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)
  const lastMessage = messages.at(-1)
  const header = useMemo(() => getToolCallGroupHeader(messages), [messages])

  const renderMessage = (message: ChatFragment) => (
    <ChatMessage
      key={message.id}
      {...message}
      {...chatMessageProps}
      {...getChatMessageProps?.(message)}
    />
  )

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
          {messages.map(renderMessage)}
        </Flex>
      </SimpleAccordion>
      {!isExpanded && lastMessage && isRunning && (
        <EaseIn currentKey={lastMessage.id}>
          {renderMessage(lastMessage)}
        </EaseIn>
      )}
    </>
  )
}

export function groupConsecutiveToolMessages(
  messages: ChatFragment[]
): ChatDisplayItem[] {
  const result: ChatDisplayItem[] = []
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

function getToolCallGroupHeader(messages: ChatFragment[]): string {
  const counts = countBy(messages, (m) =>
    toolCallBatchKey(
      resolveToolCallKind(
        m.attributes?.tool?.name ?? '',
        m.attributes?.tool?.arguments
      )
    )
  )
  const batched = sumBy(BATCHED_TOOL_KEYS, (t) => counts[t] ?? 0)
  const other = messages.length - batched

  return [
    other > 0 && `${other} tool ${pluralize('call', other)}`,
    ...BATCHED_TOOL_KEYS.filter((t) => counts[t]).map((t) =>
      toolCallBatchLabelFromKey(t, counts[t] ?? 0)
    ),
  ]
    .filter(Boolean)
    .join(', ')
}

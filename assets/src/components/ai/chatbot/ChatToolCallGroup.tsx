import { Flex } from '@pluralsh/design-system'
import { EaseIn } from 'components/utils/EaseIn'
import { ChatFragment, ChatType } from 'generated/graphql'
import { countBy, sumBy } from 'lodash'
import pluralize from 'pluralize'
import { ComponentProps, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import { ChatMessage } from './ChatMessage'
import { SimpleAccordion } from './multithread/MultiThreadViewerMessage'

export type ChatDisplayItem = ChatFragment | ChatFragment[]

const BATCHED_TOOLS = ['bash', 'read', 'grep', 'edit'] as const

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
}

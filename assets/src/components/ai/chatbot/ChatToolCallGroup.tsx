import { Flex } from '@pluralsh/design-system'
import { EaseIn } from 'components/utils/EaseIn'
import { ChatFragment, ChatType } from 'generated/graphql'
import { ComponentProps, CSSProperties, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import { ChatMessage } from './ChatMessage'
import { SimpleAccordion } from './multithread/MultiThreadViewerMessage'
import { toolCallGroupHeader } from './toolCallDisplay'

export type ChatDisplayItem = ChatFragment | ChatFragment[]

export function ChatToolCallGroup({
  messages,
  isRunning,
  chatMessageProps,
  getChatMessageProps,
  accordionStyles,
}: {
  messages: ChatFragment[]
  isRunning?: boolean
  chatMessageProps?: Partial<ComponentProps<typeof ChatMessage>>
  getChatMessageProps?: (
    message: ChatFragment
  ) => Partial<ComponentProps<typeof ChatMessage>>
  accordionStyles?: CSSProperties
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
        accordionStyles={accordionStyles}
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
  return toolCallGroupHeader(
    messages.map((message) => ({
      name: message.attributes?.tool?.name,
      arguments: message.attributes?.tool?.arguments,
    }))
  )
}

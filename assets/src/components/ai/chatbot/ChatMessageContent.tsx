import {
  Accordion,
  AccordionItem,
  Card,
  Code,
  FileIcon,
  Flex,
} from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import { CaptionP } from 'components/utils/typography/Text'
import { ChatType, ChatTypeAttributes } from 'generated/graphql'
import { ChatMessageActions } from './ChatMessage'

type ChatMessageContentProps = {
  id: string
  showActions: boolean
  content: string
  type: ChatType
  attributes?: Nullable<ChatTypeAttributes>
}

export function ChatMessageContent({
  id,
  showActions,
  content,
  type,
  attributes,
}: ChatMessageContentProps) {
  switch (type) {
    case ChatType.File:
      return (
        <FileMessageContent
          id={id}
          showActions={showActions}
          content={content}
          attributes={attributes}
        />
      )
    case ChatType.Tool:
      return <ToolMessageContent content={content} />
    case ChatType.Text:
    default:
      return <StandardMessageContent content={content} />
  }
}

function FileMessageContent({
  id,
  showActions,
  content,
  attributes,
}: Omit<ChatMessageContentProps, 'type'>) {
  const { spacing, colors } = useTheme()
  const fileName = attributes?.file?.name ?? ''
  return (
    <Accordion type="single">
      <AccordionItem
        padding="compact"
        caret="right"
        trigger={
          <Flex
            gap="small"
            align="center"
            wordBreak="break-word"
            marginRight={spacing.small}
          >
            <FileIcon
              size={12}
              color="icon-light"
            />
            <CaptionP $color="text-light">{fileName || 'File'}</CaptionP>
            <ChatMessageActions
              id={id}
              content={fileName}
              show={showActions}
            />
          </Flex>
        }
      >
        <Code css={{ background: colors['fill-three'], maxWidth: '100%' }}>
          {content}
        </Code>
      </AccordionItem>
    </Accordion>
  )
}

function ToolMessageContent({ content }: { content: string }) {
  return <div>test{content}</div>
}

function StandardMessageContent({ content }: { content: string }) {
  const { spacing } = useTheme()
  return (
    <Card
      css={{ padding: spacing.medium }}
      fillLevel={2}
    >
      {content.split('\n').map((line, i, arr) => (
        <div
          key={`${i}-${line}`}
          css={{ display: 'contents' }}
        >
          {line}
          {i !== arr.length - 1 ? <br /> : null}
        </div>
      ))}
    </Card>
  )
}

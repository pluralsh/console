import { Code, getLastStringChild, Modal } from '@pluralsh/design-system'
import { CaptionP } from 'components/utils/typography/Text'
import { ChatFragment, ChatType } from 'generated/graphql'
import { ReactElement, ReactNode, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import styled from 'styled-components'
import { ToolCallContent } from '../ToolCallContent'

export function MultiThreadViewerMessage({
  message,
}: {
  message: ChatFragment
}) {
  switch (message.type) {
    case ChatType.Tool:
      return (
        <SimpleToolCall
          content={message.content ?? ''}
          attributes={message.attributes}
        />
      )
    case ChatType.Text:
    default:
      return <SimplifiedMarkdown text={message.content ?? ''} />
  }
}

export function SimpleToolCall({
  content,
  attributes,
}: {
  content: ChatFragment['content']
  attributes: ChatFragment['attributes']
}) {
  const [isOpen, setIsOpen] = useState(false)
  const toolName = attributes?.tool?.name ?? ''

  return (
    <>
      <ClickableLabelSC onClick={() => setIsOpen(true)}>
        <CaptionP $color="text-xlight">CALLED TOOL {toolName}</CaptionP>
      </ClickableLabelSC>
      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        header={`Tool: ${toolName}`}
        size="large"
      >
        <ToolCallContent
          content={content ?? ''}
          attributes={attributes}
        />
      </Modal>
    </>
  )
}

function CodeBlockLabel({
  language,
  content,
}: {
  language?: string
  content: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const isMermaid = language === 'mermaid'
  const label = isMermaid
    ? 'DRAFTED MERMAID DIAGRAM'
    : language
      ? `${language.toUpperCase()} BLOCK`
      : 'CODE BLOCK'

  return (
    <>
      <ClickableLabelSC onClick={() => setIsOpen(true)}>
        <CaptionP $color="text-xlight">{label}</CaptionP>
      </ClickableLabelSC>
      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        header={isMermaid ? 'Mermaid Diagram' : language || 'Code'}
        size="large"
      >
        <Code language={language}>{content}</Code>
      </Modal>
    </>
  )
}

function SimplifiedMarkdown({ text }: { text: string }) {
  return (
    <SimpleMarkdownSC>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headers are bold
          h1: ({ children }) => <strong>{children}</strong>,
          h2: ({ children }) => <strong>{children}</strong>,
          h3: ({ children }) => <strong>{children}</strong>,
          h4: ({ children }) => <strong>{children}</strong>,
          h5: ({ children }) => <strong>{children}</strong>,
          h6: ({ children }) => <strong>{children}</strong>,
          // Code blocks - clickable labels that open modal with code
          pre: ({ children }) => {
            // Extract language from the code element inside pre
            const codeChild = children as ReactElement<{
              className?: string
              children?: ReactNode
            }>
            const className = codeChild?.props?.className ?? ''
            const langMatch = /language-(\w+)/.exec(className)
            const language = langMatch?.[1]?.toLowerCase()
            const content = getLastStringChild(children) || ''

            return (
              <CodeBlockLabel
                language={language}
                content={content}
              />
            )
          },
          // Inline code renders simply
          code: ({ children, className }) => {
            // If it has a language class, it's inside a pre tag and handled above
            if (className) return <>{children}</>
            return <InlineCodeSC>{children}</InlineCodeSC>
          },
          p: ({ children }) => <ParagraphSC>{children}</ParagraphSC>,
          strong: ({ children }) => <strong>{children}</strong>,
          em: ({ children }) => <span>{children}</span>,
          a: ({ children }) => <span>{children}</span>,
          ul: ({ children }) => <ListSC>{children}</ListSC>,
          ol: ({ children }) => <ListSC as="ol">{children}</ListSC>,
          li: ({ children }) => <li>{children}</li>,
          hr: () => <HrSC />,
        }}
      >
        {text}
      </ReactMarkdown>
    </SimpleMarkdownSC>
  )
}

const ClickableLabelSC = styled.button(({ theme }) => ({
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  textAlign: 'left',
  '&:hover': {
    textDecoration: 'underline',
    textDecorationColor: theme.colors['text-xlight'],
  },
}))

const SimpleMarkdownSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
}))

const ParagraphSC = styled.p(() => ({
  margin: 0,
}))

const InlineCodeSC = styled.code(({ theme }) => ({
  fontFamily: theme.fontFamilies.mono,
  fontSize: '0.9em',
  backgroundColor: theme.colors['fill-two'],
  padding: `0 ${theme.spacing.xxsmall}px`,
  borderRadius: theme.borderRadiuses.medium,
}))

const ListSC = styled.ul(({ theme }) => ({
  margin: 0,
  paddingLeft: theme.spacing.large,
}))

const HrSC = styled.hr(({ theme }) => ({
  height: 1,
  backgroundColor: theme.colors.border,
  border: 0,
  margin: `${theme.spacing.xsmall}px 0`,
  width: '100%',
}))

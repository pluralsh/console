import {
  Accordion,
  AccordionItem,
  Code,
  Flex,
  getLastStringChild,
  Modal,
} from '@pluralsh/design-system'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { CaptionP, InlineA } from 'components/utils/typography/Text'
import { ChatFragment, ChatType } from 'generated/graphql'
import { truncate } from 'lodash'
import { ReactElement, ReactNode, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import styled, { useTheme } from 'styled-components'
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
  isPending,
  customResultBody,
  customLabel,
}: {
  content?: ChatFragment['content']
  attributes: ChatFragment['attributes']
  isPending?: boolean
  customResultBody?: ReactNode
  customLabel?: ReactNode
}) {
  const { colors } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [finishedAnimating, setFinishedAnimating] = useState(false)
  const toolName = attributes?.tool?.name ?? ''
  const command = `${attributes?.tool?.arguments?.['command'] ?? ''}`
  if (!customLabel && toolName.toLowerCase().includes('bash')) {
    return (
      <SimpleAccordion
        label={
          <CaptionP
            as="span"
            $color="text-light"
          >
            Bash{' '}
            <CaptionP
              as="span"
              $color="text-xlight"
            >
              {truncate(command, { length: 30 })}
            </CaptionP>
          </CaptionP>
        }
      >
        <Flex
          direction="column"
          gap="xsmall"
          minWidth={0}
          width="100%"
        >
          <Code
            language="bash"
            showHeader={false}
          >
            {command}
          </Code>
          <Code showHeader={false}>{content ?? ''}</Code>
        </Flex>
      </SimpleAccordion>
    )
  }
  return (
    <>
      <ClickableLabelSC onClick={() => setIsOpen(true)}>
        {customLabel || (
          <CaptionP
            $shimmer={isPending}
            $color="text-xlight"
          >
            {isPending ? 'Calling' : 'Called'} tool{' '}
            <span css={{ color: colors['text-light'] }}>{toolName}</span>
          </CaptionP>
        )}
      </ClickableLabelSC>
      <Modal
        open={isOpen}
        onClose={() => {
          setIsOpen(false)
          setFinishedAnimating(false)
        }}
        onAnimationEnd={() => setFinishedAnimating(true)}
        header={`Tool: ${toolName}`}
        size="large"
      >
        <ToolCallContent
          content={content ?? ''}
          attributes={attributes}
          customResultBody={
            finishedAnimating ? (
              customResultBody
            ) : (
              <RectangleSkeleton
                $height={160}
                $width="100%"
              />
            )
          }
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

  if (language === 'bash' || language === 'sh')
    return (
      <SimpleAccordion label={label}>
        <Code
          showHeader={false}
          language={language}
        >
          {content}
        </Code>
      </SimpleAccordion>
    )

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

export function SimplifiedMarkdown({ text }: { text: string }) {
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
          a: ({ children, href }) => (
            <InlineA
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </InlineA>
          ),
          ul: ({ children }) => <ListSC>{children}</ListSC>,
          ol: ({ children }) => <ListSC as="ol">{children}</ListSC>,
          li: ({ children }) => <li>{children}</li>,
          hr: () => <HrSC />,
          table: ({ children }) => (
            <TableWrapperSC>
              <TableSC>{children}</TableSC>
            </TableWrapperSC>
          ),
          th: ({ children }) => <ThSC>{children}</ThSC>,
          td: ({ children }) => <TdSC>{children}</TdSC>,
        }}
      >
        {text}
      </ReactMarkdown>
    </SimpleMarkdownSC>
  )
}

export function SimpleAccordion({
  label,
  defaultOpen = false,
  children,
}: {
  label: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <Accordion
      type="single"
      value={defaultOpen ? 'val' : undefined}
      css={{ background: 'none', border: 'none', width: '100%' }}
    >
      <AccordionItem
        value="val"
        trigger={<CaptionP $color="text-xlight">{label}</CaptionP>}
        padding="none"
        caret="none"
      >
        {children}
      </AccordionItem>
    </Accordion>
  )
}

export const ClickableLabelSC = styled.button(({ theme }) => ({
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
  wordBreak: 'break-word',
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

const TableWrapperSC = styled.div(({ theme }) => ({
  paddingTop: theme.spacing.medium,
  overflowX: 'auto',
  maxWidth: '100%',
  minHeight: 'fit-content',
}))

const TableSC = styled.table(() => ({
  borderCollapse: 'separate',
  borderSpacing: 0,
  minWidth: '100%',
  width: 'max-content',
}))

const ThSC = styled.th(({ theme }) => ({
  padding: theme.spacing.small,
  height: 40,
  textAlign: 'left',
  backgroundColor: theme.colors['fill-one'],
  border: theme.borders['fill-two'],
  borderBottom: theme.borders.default,
  'tr:first-child &': {
    '&:first-child': { borderTopLeftRadius: theme.borderRadiuses.large },
    '&:last-child': { borderTopRightRadius: theme.borderRadiuses.large },
  },
  '&:not(:last-child)': { borderRight: 'none' },
  '&:not(:first-child)': { borderLeft: 'none' },
}))

const TdSC = styled.td(({ theme }) => ({
  backgroundColor: theme.colors['fill-zero-selected'],
  padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
  color: theme.colors['text-light'],
  height: 40,
  border: theme.borders['fill-two'],
  borderBottom: theme.borders.default,
  borderTop: 'none',
  textAlign: 'left',
  'tr:last-child &': {
    borderBottom: theme.borders['fill-two'],
    '&:first-child': { borderBottomLeftRadius: theme.borderRadiuses.large },
    '&:last-child': { borderBottomRightRadius: theme.borderRadiuses.large },
  },
  '&:not(:last-child)': { borderRight: 'none' },
  '&:not(:first-child)': { borderLeft: 'none' },
}))

import { Code, Markdown, getLastStringChild } from '@pluralsh/design-system'
import { ComponentProps, HTMLAttributes, ReactElement, ReactNode } from 'react'
import styled from 'styled-components'
import { stripEmoji } from '../stripEmoji'

type ChatMarkdownProps = ComponentProps<typeof Markdown>

/**
 * Conversational markdown for chat / workbench.
 * Caps agent `#` headings to body scale and quiets inline code chips.
 * body2 size; emphasis via `text` fill + emoji stripped.
 *
 * Overrides are passed as ReactMarkdown `components` (merged after DS defaults)
 * so they win over MdH1/InlineCode styled rules.
 */
export function ChatMarkdown({
  components,
  text,
  ...props
}: ChatMarkdownProps) {
  const displayText = typeof text === 'string' ? stripEmoji(text) : text

  return (
    <ChatMarkdownSC>
      <Markdown
        {...props}
        text={displayText}
        components={{
          h1: ChatH1,
          h2: ChatH2,
          h3: ChatH3,
          h4: ChatH4,
          h5: ChatH4,
          h6: ChatH4,
          p: ChatP,
          li: ChatLi,
          code: ChatInlineCode,
          pre: ChatPre,
          table: ChatTable,
          th: ChatTh,
          td: ChatTd,
          ...components,
        }}
      />
    </ChatMarkdownSC>
  )
}

const ChatMarkdownSC = styled.div({
  width: '100%',
})

const headingReset = {
  margin: 0,
  padding: 0,
  '&:first-child': { paddingTop: 0 },
} as const

const ChatH1 = styled.h1(({ theme }) => ({
  ...headingReset,
  ...theme.partials.text.body2Bold,
  color: theme.colors.text,
  paddingTop: theme.spacing.small,
}))

const ChatH2 = styled.h2(({ theme }) => ({
  ...headingReset,
  ...theme.partials.text.body2Bold,
  color: theme.colors['text-light'],
  paddingTop: theme.spacing.xsmall,
}))

const ChatH3 = styled.h3(({ theme }) => ({
  ...headingReset,
  ...theme.partials.text.body2Bold,
  color: theme.colors['text-light'],
  paddingTop: theme.spacing.xsmall,
}))

const ChatH4 = styled.h4(({ theme }) => ({
  ...headingReset,
  ...theme.partials.text.body2Bold,
  color: theme.colors['text-light'],
  paddingTop: theme.spacing.xsmall,
}))

/** Major prose: body2; brightest fill (`text`) for findings. */
const ChatP = styled.p(({ theme }) => ({
  margin: 0,
  padding: 0,
  paddingTop: theme.spacing.xsmall,
  marginBottom: 0,
  ...theme.partials.text.body2,
  color: theme.colors.text,
  '&:first-child': { paddingTop: 0 },
  'h1 + &, h2 + &, h3 + &, h4 + &, h5 + &, h6 + &': {
    paddingTop: theme.spacing.xxsmall,
  },
}))

const ChatLi = styled.li(({ theme }) => ({
  margin: 0,
  marginBottom: theme.spacing.xxsmall,
  padding: 0,
  ...theme.partials.text.body2,
  color: theme.colors.text,
  '&:last-child': { marginBottom: 0 },
}))

function ChatInlineCode({
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { className?: string }) {
  // Fenced blocks are handled by `pre`; language class means nested code.
  if (className)
    return (
      <code
        className={className}
        {...props}
      />
    )
  return <QuietInlineCodeSC {...props} />
}

/** Fenced blocks without a language chrome row (avoids PYTHON + Code header). */
function ChatPre({ children }: { children?: ReactNode }) {
  const codeChild = children as ReactElement<{
    className?: string
    children?: ReactNode
  }>
  const className = codeChild?.props?.className ?? ''
  const language = /language-(\w+)/.exec(className)?.[1]
  const content = getLastStringChild(children) || ''

  return (
    <Code
      language={language}
      showHeader={false}
    >
      {content}
    </Code>
  )
}

function ChatTable(props: HTMLAttributes<HTMLTableElement>) {
  return (
    <ChatTableWrapperSC>
      <ChatTableSC {...props} />
    </ChatTableWrapperSC>
  )
}

const QuietInlineCodeSC = styled.code(({ theme }) => ({
  fontFamily: theme.fontFamilies.mono,
  fontSize: '0.9em',
  lineHeight: 'inherit',
  color: theme.colors['text-light'],
  backgroundColor:
    theme.mode === 'light'
      ? theme.colors['fill-two']
      : theme.colors['fill-one'],
  padding: `0 ${theme.spacing.xxsmall}px`,
  borderRadius: theme.borderRadiuses.medium,
  border: 'none',
  wordBreak: 'break-word',
}))

const ChatTableWrapperSC = styled.div(({ theme }) => ({
  paddingTop: theme.spacing.xsmall,
  maxWidth: '100%',
  width: '100%',
  minWidth: 0,
}))

const ChatTableSC = styled.table(() => ({
  borderCollapse: 'separate',
  borderSpacing: 0,
  width: '100%',
  maxWidth: '100%',
  tableLayout: 'fixed',
}))

const chatCellWrap = {
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
  verticalAlign: 'top',
  '& code': {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
} as const

const ChatTh = styled.th(({ theme }) => ({
  padding: theme.spacing.small,
  textAlign: 'left',
  backgroundColor: theme.colors['fill-one'],
  border: theme.borders['fill-two'],
  borderBottom: theme.borders.default,
  ...chatCellWrap,
  'tr:first-child &': {
    '&:first-child': { borderTopLeftRadius: theme.borderRadiuses.large },
    '&:last-child': { borderTopRightRadius: theme.borderRadiuses.large },
  },
  '&:not(:last-child)': { borderRight: 'none' },
  '&:not(:first-child)': { borderLeft: 'none' },
}))

const ChatTd = styled.td(({ theme }) => ({
  backgroundColor:
    theme.mode === 'light'
      ? theme.colors['fill-one']
      : theme.colors['fill-zero-selected'],
  padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
  color: theme.colors['text-light'],
  textAlign: 'left',
  border: theme.borders['fill-two'],
  borderBottom: theme.borders.default,
  borderTop: 'none',
  ...chatCellWrap,
  'tr:last-child &': {
    borderBottom: theme.borders['fill-two'],
    '&:first-child': { borderBottomLeftRadius: theme.borderRadiuses.large },
    '&:last-child': { borderBottomRightRadius: theme.borderRadiuses.large },
  },
  '&:not(:last-child)': { borderRight: 'none' },
  '&:not(:first-child)': { borderLeft: 'none' },
}))

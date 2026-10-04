import { Code, Markdown, getLastStringChild } from '@pluralsh/design-system'
import { ComponentProps, HTMLAttributes, ReactElement, ReactNode } from 'react'
import styled, { type DefaultTheme } from 'styled-components'

type ChatMarkdownProps = ComponentProps<typeof Markdown>

/**
 * Conversational markdown for chat / workbench.
 * Keeps agent `#` headings one step above body scale and quiets inline code chips.
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
  return (
    <ChatMarkdownSC>
      <Markdown
        {...props}
        text={text}
        components={{
          h1: ChatH1,
          h2: ChatH2,
          h3: ChatH3,
          h4: ChatH4,
          h5: ChatH4,
          h6: ChatH4,
          p: ChatP,
          ul: ChatUl,
          ol: ChatOl,
          li: ChatLi,
          blockquote: ChatBlockquote,
          hr: ChatHr,
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

/**
 * Vertical rhythm: sections (24) > blocks (12) > list items (8), and content
 * sits closer to its own heading (8) than to the previous block.
 */
const blockSpacing = (theme: DefaultTheme) =>
  ({
    margin: 0,
    paddingTop: theme.spacing.small,
    '&:first-child': { paddingTop: 0 },
    'h1 + &, h2 + &, h3 + &, h4 + &, h5 + &, h6 + &': {
      paddingTop: theme.spacing.xsmall,
    },
  }) as const

/** Heading type scale shared by the chat markdown renderers. */
export const chatHeadingText = (theme: DefaultTheme, level: number) =>
  ({
    1: theme.partials.text.subtitle2,
    2: theme.partials.text.body1Bold,
  })[level] ?? theme.partials.text.body2Bold

const headingReset = {
  margin: 0,
  padding: 0,
  '&:first-child': { paddingTop: 0 },
} as const

const ChatH1 = styled.h1(({ theme }) => ({
  ...headingReset,
  ...chatHeadingText(theme, 1),
  color: theme.colors.text,
  paddingTop: theme.spacing.large,
}))

const ChatH2 = styled.h2(({ theme }) => ({
  ...headingReset,
  ...chatHeadingText(theme, 2),
  color: theme.colors.text,
  paddingTop: theme.spacing.large,
}))

const ChatH3 = styled.h3(({ theme }) => ({
  ...headingReset,
  ...chatHeadingText(theme, 3),
  color: theme.colors.text,
  paddingTop: theme.spacing.medium,
}))

const ChatH4 = styled.h4(({ theme }) => ({
  ...headingReset,
  ...chatHeadingText(theme, 4),
  color: theme.colors['text-light'],
  paddingTop: theme.spacing.small,
}))

/** Major prose: body2 loose line-height for readable findings. */
const ChatP = styled.p(({ theme }) => ({
  ...blockSpacing(theme),
  ...theme.partials.text.body2LooseLineHeight,
  color: theme.colors.text,
}))

/** List layout shared by the chat markdown renderers. */
export const chatListCss = (theme: DefaultTheme, itemGap: number) =>
  ({
    paddingLeft: theme.spacing.large,
    // Margin, not flex: Chrome crashes (error code 5) when a list is a flex
    // container and its ::marker is styled.
    '& > li + li': { marginTop: itemGap },
    '& > li::marker': { color: theme.colors['text-xlight'] },
    'li > &': { paddingTop: theme.spacing.xxsmall },
  }) as const

const chatList = (theme: DefaultTheme) =>
  ({
    ...blockSpacing(theme),
    ...chatListCss(theme, theme.spacing.xsmall),
    'li > & > li + li': { marginTop: theme.spacing.xxsmall },
  }) as const

const ChatUl = styled.ul(({ theme }) => chatList(theme))

const ChatOl = styled.ol(({ theme }) => chatList(theme))

const ChatLi = styled.li(({ theme }) => ({
  margin: 0,
  padding: 0,
  ...theme.partials.text.body2LooseLineHeight,
  color: theme.colors.text,
}))

const ChatBlockquote = styled.blockquote(({ theme }) => ({
  ...blockSpacing(theme),
  '& > *': {
    borderLeft: `2px solid ${theme.colors.border}`,
    paddingLeft: theme.spacing.small,
    color: theme.colors['text-light'],
  },
}))

const ChatHr = styled.hr(({ theme }) => ({
  height: 1,
  border: 0,
  backgroundColor: theme.colors.border,
  margin: `${theme.spacing.medium}px 0 ${theme.spacing.xxsmall}px`,
  '&:first-child': { marginTop: 0 },
}))

const ChatPreSC = styled.div(({ theme }) => ({
  ...blockSpacing(theme),
  minWidth: 0,
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
    <ChatPreSC>
      <Code
        language={language}
        showHeader={false}
      >
        {content}
      </Code>
    </ChatPreSC>
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
  ...theme.partials.text.mono,
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
  ...blockSpacing(theme),
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

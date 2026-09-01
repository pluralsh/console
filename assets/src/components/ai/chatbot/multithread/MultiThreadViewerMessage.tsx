import {
  Accordion,
  AccordionItem,
  Code,
  Flex,
  getLastStringChild,
  markdownSanitizeSchema,
  Modal,
} from '@pluralsh/design-system'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Body2P, InlineA } from 'components/utils/typography/Text'
import { ChatFragment, ChatType } from 'generated/graphql'
import { isNil } from 'lodash'
import { ComponentProps, ReactElement, ReactNode, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import styled, { CSSProperties, useTheme } from 'styled-components'
import { ToolCallContent } from '../ToolCallContent'
import {
  getCommand,
  getPython,
  resolveToolCallKind,
  toolCallDisplaySubtitle,
  toolCallDisplayTitle,
} from '../toolCallDisplay'

import {
  CHIP_ATTRIBUTE_SCHEMA,
  PLRL_CHIP_TAG_NAMES,
} from '../input/autocomplete/mentionTypes'
import { plrlChipComponents } from '../input/autocomplete/PlrlChipMdRenderers'
import { stripEmoji } from '../../stripEmoji'

const chipSanitizeSchema = {
  ...markdownSanitizeSchema,
  tagNames: [
    ...(markdownSanitizeSchema.tagNames ?? []),
    ...PLRL_CHIP_TAG_NAMES,
  ],
  attributes: {
    ...markdownSanitizeSchema.attributes,
    ...CHIP_ATTRIBUTE_SCHEMA,
  },
}

const REHYPE_PLUGINS: ComponentProps<typeof ReactMarkdown>['rehypePlugins'] = [
  rehypeRaw,
  [rehypeSanitize, chipSanitizeSchema],
]

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
  toolRuntime,
  customResultBody,
  customLabel,
  customTitle,
  leadingIcon,
}: {
  content?: ChatFragment['content']
  attributes: ChatFragment['attributes']
  isPending?: boolean
  toolRuntime?: string
  customResultBody?: ReactNode
  customLabel?: ReactNode
  customTitle?: string
  leadingIcon?: ReactNode
}) {
  const { spacing } = useTheme()
  const toolName = attributes?.tool?.name ?? ''
  const args = attributes?.tool?.arguments
  const kind = resolveToolCallKind(toolName, args)
  const title = customTitle ?? toolCallDisplayTitle(kind, toolName, args)
  const subtitle = toolCallDisplaySubtitle(kind, toolName, args, content)
  const label = customLabel ?? (
    <ToolCallLineLabel
      title={title}
      subtitle={subtitle}
      runtime={toolRuntime}
      isPending={isPending}
      leadingIcon={leadingIcon}
    />
  )
  const accordionProps = {
    label,
    hoverCaret: true,
  }

  switch (kind) {
    case 'bash':
    case 'command_execution': {
      const command = getCommand(toolName, args)
      return (
        <SimpleAccordion {...accordionProps}>
          <Flex
            direction="column"
            gap="none"
            minWidth={0}
            width="100%"
            marginTop={spacing.xsmall}
          >
            <Code
              language="bash"
              showHeader={false}
            >
              {`$ ${command}`}
            </Code>
            <ToolCallContent
              content={content ?? ''}
              attributes={attributes}
              customResultBody={customResultBody}
              hideArguments
              flushTop
              isPending={isPending}
            />
          </Flex>
        </SimpleAccordion>
      )
    }
    case 'python_sandbox': {
      const python = getPython(args)
      return (
        <SimpleAccordion {...accordionProps}>
          <Flex
            direction="column"
            gap="none"
            minWidth={0}
            width="100%"
            marginTop={spacing.xsmall}
          >
            <Code
              language="python"
              showHeader={false}
            >
              {python}
            </Code>
            <ToolCallContent
              content={content ?? ''}
              attributes={attributes}
              customResultBody={customResultBody}
              hideArguments
              flushTop
              isPending={isPending}
            />
          </Flex>
        </SimpleAccordion>
      )
    }
    default:
      return (
        <SimpleAccordion {...accordionProps}>
          <ToolCallContent
            content={content ?? ''}
            attributes={attributes}
            customResultBody={customResultBody}
            isPending={isPending}
          />
        </SimpleAccordion>
      )
  }
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

  // Mermaid stays click-to-modal; other fences render once with no language chrome
  // (Code's language header duplicates a "PYTHON BLOCK"-style label).
  if (isMermaid) {
    return (
      <>
        <ClickableLabelSC onClick={() => setIsOpen(true)}>
          <Body2P $color="text-xlight">DRAFTED MERMAID DIAGRAM</Body2P>
        </ClickableLabelSC>
        <Modal
          open={isOpen}
          onClose={() => setIsOpen(false)}
          header="Mermaid Diagram"
          size="large"
        >
          <Code language={language}>{content}</Code>
        </Modal>
      </>
    )
  }

  return (
    <Code
      language={language}
      showHeader={false}
    >
      {content}
    </Code>
  )
}

export function SimplifiedMarkdown({
  text,
  rootLayout = 'flex',
  size = 'body2',
  tone,
}: {
  text: string
  /** `block` keeps chip/custom nodes inline inside `<p>`; `flex` stacks each mdast block (can split chips to their own row). */
  rootLayout?: 'flex' | 'block'
  /** Stream UI stays body2; hierarchy is via `tone` color. */
  size?: 'body1' | 'body2'
  /**
   * Emphasis via DS text fills (same size):
   * - major — findings / conclusions (`text`)
   * - thought — reasoning / prompts (`text-long-form`)
   * - meta — tools / status (`text-xlight`)
   */
  tone?: 'major' | 'thought' | 'meta'
}) {
  const Root = rootLayout === 'block' ? SimpleMarkdownBlockSC : SimpleMarkdownSC
  const displayText = stripEmoji(text)
  const resolvedTone = tone ?? 'thought'

  return (
    <Root
      $size={size}
      $tone={resolvedTone}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={REHYPE_PLUGINS}
        components={{
          ...plrlChipComponents,
          // Headers are bold
          h1: ({ children }) => <strong>{children}</strong>,
          h2: ({ children }) => <strong>{children}</strong>,
          h3: ({ children }) => <strong>{children}</strong>,
          h4: ({ children }) => <strong>{children}</strong>,
          h5: ({ children }) => <strong>{children}</strong>,
          h6: ({ children }) => <strong>{children}</strong>,
          // Fenced code — inline, no language chrome (header was redundant).
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
        {displayText}
      </ReactMarkdown>
    </Root>
  )
}

function ToolCallLineLabel({
  title,
  subtitle,
  runtime,
  isPending,
  leadingIcon,
}: {
  title: string
  subtitle?: string
  runtime?: string
  isPending?: boolean
  leadingIcon?: ReactNode
}) {
  return (
    <ToolCallLineSC>
      {leadingIcon}
      <Body2P
        as="span"
        className="title"
        $color="text-xlight"
        $shimmer={isPending}
      >
        {title}
      </Body2P>
      {subtitle && (
        <Body2P
          as="span"
          className="subtitle"
          $color="text-disabled"
          $shimmer={isPending}
        >
          {subtitle}
        </Body2P>
      )}
      {runtime && (
        <Body2P
          as="span"
          className="runtime"
          $color="text-disabled"
          $shimmer={isPending}
        >
          · {runtime}
        </Body2P>
      )}
    </ToolCallLineSC>
  )
}

const ARBITRARY_VALUE_NAME = 'value'
export function SimpleAccordion({
  label,
  defaultOpen = false,
  isOpen,
  setIsOpen,
  loading = false,
  children,
  accordionStyles,
  hoverCaret = false,
  caret,
  triggerWrapperStyles,
  ...props
}: {
  label?: ReactNode
  defaultOpen?: boolean
  isOpen?: boolean
  setIsOpen?: (isOpen: boolean) => void
  loading?: boolean
  accordionStyles?: CSSProperties
  /** Hide caret until hover; keep it visible (pointing down) while open. */
  hoverCaret?: boolean
  children: ReactNode
} & Partial<ComponentProps<typeof AccordionItem>>) {
  const resolvedCaret = caret ?? (hoverCaret ? 'right-quarter-mirror' : 'none')

  const accordion = (
    <Accordion
      type="single"
      defaultValue={defaultOpen ? ARBITRARY_VALUE_NAME : undefined}
      value={isOpen ? ARBITRARY_VALUE_NAME : isNil(isOpen) ? undefined : ''}
      onValueChange={(value) => setIsOpen?.(value === 'value')}
      css={{
        background: 'none',
        border: 'none',
        boxShadow: 'none',
        width: '100%',
        ...accordionStyles,
      }}
    >
      <AccordionItem
        value={ARBITRARY_VALUE_NAME}
        trigger={
          loading ? (
            <RectangleSkeleton />
          ) : typeof label === 'string' ? (
            <Body2P $color="text-xlight">{label}</Body2P>
          ) : (
            <AccordionLabelSC>{label}</AccordionLabelSC>
          )
        }
        padding="none"
        caret={resolvedCaret}
        triggerWrapperStyles={{
          ...(hoverCaret ? hoverCaretTriggerStyles : undefined),
          ...triggerWrapperStyles,
        }}
        {...props}
      >
        {children}
      </AccordionItem>
    </Accordion>
  )

  if (!hoverCaret) return accordion

  return <HoverCaretAccordionSC>{accordion}</HoverCaretAccordionSC>
}

/** Shared hover-caret rules — only the accordion's own caret (direct child `.icon`). */
export const hoverCaretAccordionCss = {
  // !important beats Accordion TriggerSC icon rules from the design system.
  // Use `>` so nested IconFrame / status icons stay visible.
  '& button > .icon': {
    width: 10,
    opacity: '0 !important',
    transition: 'opacity 0.15s ease, rotate 0.3s ease, scale 0.3s ease',
  },
  '& button:hover > .icon, & button[data-state="open"] > .icon': {
    opacity: '1 !important',
  },
} as const

/** Ensures tool-row carets are hover-only (visible while open). */
const HoverCaretAccordionSC = styled.div({
  width: '100%',
  ...hoverCaretAccordionCss,
})

export const hoverCaretTriggerStyles = {
  justifyContent: 'flex-start',
  width: 'fit-content',
  maxWidth: '100%',
  gap: 6,
} as const

/** Keeps styled tool labels on one line; size to content so caret sits after the text. */
const AccordionLabelSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2,
  flex: '0 1 auto',
  minWidth: 0,
  maxWidth: '100%',
  overflow: 'hidden',
  textAlign: 'left',
}))

const ToolCallLineSC = styled.span(({ theme }) => ({
  display: 'flex',
  alignItems: 'baseline',
  gap: theme.spacing.xsmall,
  minWidth: 0,
  maxWidth: '100%',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  '.title': {
    flexShrink: 0,
  },
  '.subtitle': {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  '.runtime': {
    flexShrink: 0,
  },
}))

export const ClickableLabelSC = styled.button(() => ({
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  textAlign: 'left',
}))

const SimpleMarkdownSC = styled.div<{
  $size?: 'body1' | 'body2'
  $tone?: 'major' | 'thought' | 'meta'
}>(({ theme, $size = 'body2', $tone }) => ({
  ...($size === 'body1'
    ? theme.partials.text.body1
    : $tone === 'major'
      ? theme.partials.text.body2LooseLineHeight
      : theme.partials.text.body2),
  color:
    theme.colors[
      $tone === 'major'
        ? 'text'
        : $tone === 'meta'
          ? 'text-xlight'
          : $tone === 'thought'
            ? 'text-long-form'
            : 'text-light'
    ],
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
}))

/** Normal block flow so inline chips stay in the same `<p>`; typography comes from size/tone props. */
const SimpleMarkdownBlockSC = styled.div<{
  $size?: 'body1' | 'body2'
  $tone?: 'major' | 'thought' | 'meta'
}>(({ theme, $size = 'body2', $tone }) => ({
  ...($size === 'body1'
    ? theme.partials.text.body1
    : $tone === 'major'
      ? theme.partials.text.body2LooseLineHeight
      : theme.partials.text.body2),
  color:
    theme.colors[
      $tone === 'major'
        ? 'text'
        : $tone === 'meta'
          ? 'text-xlight'
          : $tone === 'thought'
            ? 'text-long-form'
            : 'text-light'
    ],
  display: 'block',
  '& > *:not(:last-child)': {
    marginBottom: theme.spacing.xsmall,
  },
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
  paddingTop: theme.spacing.xsmall,
  maxWidth: '100%',
  width: '100%',
  minWidth: 0,
}))

const TableSC = styled.table(() => ({
  borderCollapse: 'separate',
  borderSpacing: 0,
  width: '100%',
  maxWidth: '100%',
  tableLayout: 'fixed',
}))

const ThSC = styled.th(({ theme }) => ({
  padding: theme.spacing.small,
  textAlign: 'left',
  verticalAlign: 'top',
  backgroundColor: theme.colors['fill-one'],
  border: theme.borders['fill-two'],
  borderBottom: theme.borders.default,
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
  'tr:first-child &': {
    '&:first-child': { borderTopLeftRadius: theme.borderRadiuses.large },
    '&:last-child': { borderTopRightRadius: theme.borderRadiuses.large },
  },
  '&:not(:last-child)': { borderRight: 'none' },
  '&:not(:first-child)': { borderLeft: 'none' },
  '& code': {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
}))

const TdSC = styled.td(({ theme }) => ({
  backgroundColor:
    theme.mode === 'light'
      ? theme.colors['fill-one']
      : theme.colors['fill-zero-selected'],
  padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
  color: theme.colors['text-light'],
  textAlign: 'left',
  verticalAlign: 'top',
  border: theme.borders['fill-two'],
  borderBottom: theme.borders.default,
  borderTop: 'none',
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
  'tr:last-child &': {
    borderBottom: theme.borders['fill-two'],
    '&:first-child': { borderBottomLeftRadius: theme.borderRadiuses.large },
    '&:last-child': { borderBottomRightRadius: theme.borderRadiuses.large },
  },
  '&:not(:last-child)': { borderRight: 'none' },
  '&:not(:first-child)': { borderLeft: 'none' },
  '& code': {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
}))
